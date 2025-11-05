import * as SQLite from 'expo-sqlite';
import { DailyRecord, LapRecord } from '../models/RecordModels';

/**
 * Veritabanı işlemleri için servis sınıfı (Expo SDK 54 uyumlu)
 */
class DatabaseService {
  constructor() {
    this.db = null;
    // Veritabanını açıp tabloları oluşturmayı başlat
    this.ready = this.initDatabase();
  }

  /**
   * Veritabanını açar ve tabloları oluşturur
   */
  async initDatabase() {
    // Yeni API: openDatabaseAsync
    this.db = await SQLite.openDatabaseAsync('studyjournal.db');

    // Foreign key desteğini aktif edelim
    await this.db.execAsync('PRAGMA foreign_keys = ON;');

    // Tabloları tek bir transaction içinde oluştur
    await this.db.withTransactionAsync(async () => {
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS DailyRecords (
          Id INTEGER PRIMARY KEY AUTOINCREMENT,
          Day TEXT NOT NULL,
          TotalTimeForDay TEXT DEFAULT '00:00:00',
          DailyNote TEXT
        );
      `);

      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS LapRecords (
          Id INTEGER PRIMARY KEY AUTOINCREMENT,
          LapDate TEXT DEFAULT (datetime('now','localtime')),
          Duration TEXT,
          TotalTime TEXT,
          Note TEXT,
          DailyRecordId INTEGER,
          SessionIndex INTEGER DEFAULT 1,
          IsManual INTEGER DEFAULT 0,
          FOREIGN KEY (DailyRecordId) REFERENCES DailyRecords(Id) ON DELETE CASCADE
        );
      `);
    });

    // Ensure SessionIndex column exists for older DBs
    try {
      const columns = await this.db.getAllAsync("PRAGMA table_info(LapRecords);");
      const hasSessionIndex = columns.some(c => c.name === 'SessionIndex');
      if (!hasSessionIndex) {
        await this.db.execAsync("ALTER TABLE LapRecords ADD COLUMN SessionIndex INTEGER DEFAULT 1;");
      }
      const hasIsManual = columns.some(c => c.name === 'IsManual');
      if (!hasIsManual) {
        await this.db.execAsync("ALTER TABLE LapRecords ADD COLUMN IsManual INTEGER DEFAULT 0;");
      }
    } catch (e) {
      // ignore alter errors
    }
  }

  /**
   * Gün için mevcut kaydı alır ya da oluşturur
   */
  async getOrCreateDailyRecordForDay(day) {
    await this.ready;
    const safeDay = day || `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}`;
    const existing = await this.db.getFirstAsync('SELECT Id FROM DailyRecords WHERE Day = ?;', [safeDay]);
    if (existing && existing.Id) return existing.Id;
    const result = await this.db.runAsync(
      'INSERT INTO DailyRecords (Day, TotalTimeForDay, DailyNote) VALUES (?, ?, ?);',
      [safeDay, '00:00:00', '']
    );
    return result.lastInsertRowId;
  }

  /**
   * Mevcut günlük kaydı için maksimum SessionIndex değerini döndürür
   */
  async getMaxSessionIndex(dailyRecordId) {
    await this.ready;
    if (dailyRecordId == null) return 0;
    const row = await this.db.getFirstAsync('SELECT MAX(SessionIndex) as Max FROM LapRecords WHERE DailyRecordId = ? AND (IsManual IS NULL OR IsManual = 0);', [Number(dailyRecordId)]);
    return row && row.Max ? Number(row.Max) : 0;
  }

  /**
   * Yeni bir günlük kayıt ekler
   * @param {DailyRecord} dailyRecord
   * @returns {Promise<number>} Eklenen kaydın ID'si
   */
  async addDailyRecord(dailyRecord) {
    await this.ready;
    const result = await this.db.runAsync(
      'INSERT INTO DailyRecords (Day, TotalTimeForDay, DailyNote) VALUES (?, ?, ?);',
      [dailyRecord.day, dailyRecord.totalTimeForDay, dailyRecord.dailyNote]
    );
    return result.lastInsertRowId;
  }

  /**
   * Yeni bir tur kaydı ekler
   * @param {LapRecord} lapRecord
   * @param {number} dailyRecordId
   * @param {number} sessionIndex
   * @returns {Promise<number>}
   */
  async addLapRecord(lapRecord, dailyRecordId, sessionIndex = 1) {
    await this.ready;
    if (dailyRecordId == null) throw new Error('Günlük kayıt bulunamadı (dailyRecordId).');
    const safeLapDate = lapRecord?.lapDate || new Date().toISOString();
    const safeDuration = lapRecord?.duration || '00:00:00';
    const safeTotal = lapRecord?.totalTime || safeDuration;
    const safeNote = lapRecord?.note ?? '';
    const safeSession = Number(sessionIndex) || 1;
    const safeDailyId = Number(dailyRecordId);
    const result = await this.db.runAsync(
      'INSERT INTO LapRecords (LapDate, Duration, TotalTime, Note, DailyRecordId, SessionIndex, IsManual) VALUES (?, ?, ?, ?, ?, ?, ?);',
      [safeLapDate, safeDuration, safeTotal, safeNote, safeDailyId, safeSession, lapRecord?.isManual ? 1 : 0]
    );
    return result.lastInsertRowId;
  }

  /**
   * Tüm günlük kayıtları getirir
   * @returns {Promise<Array<DailyRecord>>}
   */
  async getAllDailyRecords() {
    await this.ready;
    const rows = await this.db.getAllAsync('SELECT * FROM DailyRecords ORDER BY Day DESC;');
    return rows.map(row => new DailyRecord(
      row.Id,
      row.Day,
      [],
      row.TotalTimeForDay,
      row.DailyNote
    ));
  }

  /**
   * Belirli bir günün tur kayıtlarını getirir
   * @param {number} dailyRecordId
   * @returns {Promise<Array<LapRecord>>}
   */
  async getLapRecordsForDay(dailyRecordId) {
    await this.ready;
    if (dailyRecordId == null) return [];
    const rows = await this.db.getAllAsync(
      'SELECT * FROM LapRecords WHERE DailyRecordId = ? ORDER BY SessionIndex ASC, LapDate;',
      [Number(dailyRecordId)]
    );
    return rows.map(row => new LapRecord(
      row.Id,
      row.LapDate,
      row.Duration,
      row.TotalTime,
      row.Note,
      row.SessionIndex,
      row.IsManual
    ));
  }

  /**
   * Belirli bir günün detaylarını tur kayıtlarıyla birlikte getirir
   * @param {number} dailyRecordId
   * @returns {Promise<DailyRecord>}
   */
  async getDailyRecordWithLaps(dailyRecordId) {
    await this.ready;
    if (dailyRecordId == null) throw new Error('Kayıt bulunamadı');
    const row = await this.db.getFirstAsync(
      'SELECT * FROM DailyRecords WHERE Id = ?;',
      [Number(dailyRecordId)]
    );
    if (!row) {
      throw new Error('Kayıt bulunamadı');
    }
    const dailyRecord = new DailyRecord(
      row.Id,
      row.Day,
      [],
      row.TotalTimeForDay,
      row.DailyNote
    );
    dailyRecord.laps = await this.getLapRecordsForDay(dailyRecordId);
    return dailyRecord;
  }

  /**
   * Günlük toplam süreyi turlardan hesaplayıp günceller
   */
  async recomputeTotalTimeForDay(dailyRecordId) {
    await this.ready;
    if (dailyRecordId == null) return '00:00:00';
    const rows = await this.db.getAllAsync('SELECT Duration FROM LapRecords WHERE DailyRecordId = ?;', [Number(dailyRecordId)]);
    let totalMs = 0;
    for (const r of rows) {
      if (!r.Duration) continue;
      const [h, m, s] = r.Duration.split(':').map(Number);
      totalMs += (h * 3600 + m * 60 + s) * 1000;
    }
    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor((totalMs % 3600000) / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const formatted = `${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
    await this.db.runAsync('UPDATE DailyRecords SET TotalTimeForDay = ? WHERE Id = ?;', [formatted, dailyRecordId]);
    return formatted;
  }

  /**
   * Günlük kaydı günceller
   * @param {DailyRecord} dailyRecord
   * @returns {Promise<void>}
   */
  async updateDailyRecord(dailyRecord) {
    await this.ready;
    const result = await this.db.runAsync(
      'UPDATE DailyRecords SET TotalTimeForDay = ?, DailyNote = ? WHERE Id = ?;',
      [dailyRecord.totalTimeForDay, dailyRecord.dailyNote, dailyRecord.id]
    );
    if (!result || result.changes <= 0) {
      throw new Error('Kayıt güncellenemedi');
    }
  }

  async updateLapRecordNote(lapId, note) {
    await this.ready;
    const result = await this.db.runAsync(
      'UPDATE LapRecords SET Note = ? WHERE Id = ?;',
      [note, lapId]
    );
    if (!result || result.changes <= 0) {
      throw new Error('Tur notu güncellenemedi');
    }
  }

  /**
   * Günlük kaydı siler
   * @param {number} dailyRecordId
   * @returns {Promise<void>}
   */
  async deleteDailyRecord(dailyRecordId) {
    await this.ready;
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(
        'DELETE FROM LapRecords WHERE DailyRecordId = ?;',
        [dailyRecordId]
      );
      const result = await this.db.runAsync(
        'DELETE FROM DailyRecords WHERE Id = ?;',
        [dailyRecordId]
      );
      if (!result || result.changes <= 0) {
        throw new Error('Kayıt silinemedi');
      }
    });
  }
}

// Singleton instance
export default new DatabaseService();