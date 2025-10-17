/**
 * Veri modelleri - DailyRecord ve LapRecord
 * Kronometre kayıtları için kullanılacak
 */

/**
 * Günlük kayıt modeli
 * @param {number} id - Kayıt ID'si
 * @param {string} day - Gün (ISO string formatında)
 * @param {Array} laps - Tur kayıtları listesi
 * @param {string} totalTimeForDay - Günlük toplam süre (HH:MM:SS formatında)
 * @param {string} dailyNote - Günlük genel not
 */
export class DailyRecord {
  constructor(id = null, day = new Date().toISOString(), laps = [], totalTimeForDay = '00:00:00', dailyNote = '') {
    this.id = id;
    this.day = day;
    this.laps = laps;
    this.totalTimeForDay = totalTimeForDay;
    this.dailyNote = dailyNote;
  }

  // Toplam süreyi güncelle
  updateTotalTime() {
    if (!this.laps || this.laps.length === 0) {
      this.totalTimeForDay = '00:00:00';
      return;
    }

    // Tüm turların sürelerini topla
    let totalMilliseconds = 0;
    this.laps.forEach(lap => {
      const [hours, minutes, seconds] = lap.duration.split(':').map(Number);
      totalMilliseconds += (hours * 3600 + minutes * 60 + seconds) * 1000;
    });

    // Toplam süreyi HH:MM:SS formatına dönüştür
    this.totalTimeForDay = formatTimeFromMs(totalMilliseconds);
  }
}

/**
 * Tur kaydı modeli
 * @param {number} id - Kayıt ID'si
 * @param {string} lapDate - Tur tarihi ve saati (ISO string formatında)
 * @param {string} duration - Tur süresi (HH:MM:SS formatında)
 * @param {string} totalTime - O ana kadarki toplam süre (HH:MM:SS formatında)
 * @param {string} note - Tur notu
 * @param {number} sessionIndex - Gün içindeki seans numarası
 */
export class LapRecord {
  constructor(id = null, lapDate = new Date().toISOString(), duration = '00:00:00', totalTime = '00:00:00', note = '', sessionIndex = 1) {
    this.id = id;
    this.lapDate = lapDate;
    this.duration = duration;
    this.totalTime = totalTime;
    this.note = note;
    this.sessionIndex = sessionIndex;
  }
}

/**
 * Milisaniyeyi HH:MM:SS formatına dönüştürür
 * @param {number} milliseconds - Milisaniye cinsinden süre
 * @returns {string} HH:MM:SS formatında süre
 */
export const formatTimeFromMs = (milliseconds) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0')
  ].join(':');
};

/**
 * HH:MM:SS formatındaki süreyi milisaniyeye dönüştürür
 * @param {string} timeString - HH:MM:SS formatında süre
 * @returns {number} Milisaniye cinsinden süre
 */
export const parseTimeToMs = (timeString) => {
  const [hours, minutes, seconds] = timeString.split(':').map(Number);
  return (hours * 3600 + minutes * 60 + seconds) * 1000;
};