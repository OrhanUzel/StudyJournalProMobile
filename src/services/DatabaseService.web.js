import { DailyRecord, LapRecord } from '../models/RecordModels';

/**
 * Web ortamı için localStorage tabanlı veritabanı servisi.
 * expo-sqlite yerine geçer ve aynı arayüzü sunar.
 */
class WebDatabaseService {
  constructor() {
    this.storageKey = 'studyjournal_db';
    this.state = { dailyRecords: [], lapRecords: [], nextDailyId: 1, nextLapId: 1 };
    this.ready = Promise.resolve();
    this._load();
  }

  _load() {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(this.storageKey) : null;
      if (raw) {
        this.state = JSON.parse(raw);
      }
    } catch (e) {
      // ignore storage errors
    }
  }

  _save() {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(this.storageKey, JSON.stringify(this.state));
      }
    } catch (e) {
      // ignore storage errors
    }
  }

  async getOrCreateDailyRecordForDay(day) {
    await this.ready;
    const existing = this.state.dailyRecords.find(r => r.Day === day);
    if (existing) return existing.Id;
    const id = this.state.nextDailyId++;
    this.state.dailyRecords.push({ Id: id, Day: day, TotalTimeForDay: '00:00:00', DailyNote: '' });
    this._save();
    return id;
  }

  async getMaxSessionIndex(dailyRecordId) {
    await this.ready;
    const laps = this.state.lapRecords.filter(l => l.DailyRecordId === dailyRecordId);
    if (laps.length === 0) return 0;
    return Math.max(...laps.map(l => Number(l.SessionIndex || 1)));
  }

  async addDailyRecord(dailyRecord) {
    await this.ready;
    const id = this.state.nextDailyId++;
    this.state.dailyRecords.push({
      Id: id,
      Day: dailyRecord.day,
      TotalTimeForDay: dailyRecord.totalTimeForDay || '00:00:00',
      DailyNote: dailyRecord.dailyNote || ''
    });
    this._save();
    return id;
  }

  async addLapRecord(lapRecord, dailyRecordId, sessionIndex = 1) {
    await this.ready;
    const id = this.state.nextLapId++;
    const record = {
      Id: id,
      LapDate: lapRecord.lapDate,
      Duration: lapRecord.duration,
      TotalTime: lapRecord.totalTime,
      Note: lapRecord.note || '',
      DailyRecordId: dailyRecordId,
      SessionIndex: sessionIndex
    };
    this.state.lapRecords.push(record);
    this._save();
    return id;
  }

  async getAllDailyRecords() {
    await this.ready;
    // Newest day first
    const rows = [...this.state.dailyRecords].sort((a, b) => (a.Day < b.Day ? 1 : a.Day > b.Day ? -1 : 0));
    return rows.map(row => new DailyRecord(row.Id, row.Day, [], row.TotalTimeForDay, row.DailyNote));
  }

  async getLapRecordsForDay(dailyRecordId) {
    await this.ready;
    const rows = this.state.lapRecords
      .filter(r => r.DailyRecordId === dailyRecordId)
      .sort((a, b) => {
        if (a.SessionIndex !== b.SessionIndex) return a.SessionIndex - b.SessionIndex;
        return a.LapDate.localeCompare(b.LapDate);
      });
    return rows.map(row => new LapRecord(row.Id, row.LapDate, row.Duration, row.TotalTime, row.Note, row.SessionIndex));
  }

  async getDailyRecordWithLaps(dailyRecordId) {
    await this.ready;
    const row = this.state.dailyRecords.find(r => r.Id === dailyRecordId);
    if (!row) throw new Error('Kayıt bulunamadı');
    const dailyRecord = new DailyRecord(row.Id, row.Day, [], row.TotalTimeForDay, row.DailyNote);
    dailyRecord.laps = await this.getLapRecordsForDay(dailyRecordId);
    return dailyRecord;
  }

  async recomputeTotalTimeForDay(dailyRecordId) {
    await this.ready;
    const rows = this.state.lapRecords.filter(r => r.DailyRecordId === dailyRecordId);
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
    const row = this.state.dailyRecords.find(r => r.Id === dailyRecordId);
    if (row) {
      row.TotalTimeForDay = formatted;
      this._save();
    }
    return formatted;
  }

  async updateDailyRecord(dailyRecord) {
    await this.ready;
    const row = this.state.dailyRecords.find(r => r.Id === dailyRecord.id);
    if (!row) throw new Error('Kayıt güncellenemedi');
    row.TotalTimeForDay = dailyRecord.totalTimeForDay;
    row.DailyNote = dailyRecord.dailyNote;
    this._save();
  }

  async deleteDailyRecord(dailyRecordId) {
    await this.ready;
    this.state.lapRecords = this.state.lapRecords.filter(l => l.DailyRecordId !== dailyRecordId);
    this.state.dailyRecords = this.state.dailyRecords.filter(r => r.Id !== dailyRecordId);
    this._save();
  }
}

export default new WebDatabaseService();