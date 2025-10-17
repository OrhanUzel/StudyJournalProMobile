/**
 * Basit bir EventEmitter sınıfı
 */
class SimpleEventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return () => this.removeListener(event, listener);
  }

  removeListener(event, listener) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(l => l !== listener);
  }

  emit(event, ...args) {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => {
      listener(...args);
    });
  }
}

/**
 * Asenkron çalışan kronometre servisi
 * UI thread'ini bloke etmeden arka planda çalışır
 */
class StopwatchService {
  constructor() {
    this.isRunning = false;
    this.startTime = 0;
    this.elapsedTime = 0;
    this.lapStartTime = 0;
    this.laps = [];
    this.intervalId = null;
    this.eventEmitter = new SimpleEventEmitter();
    this._lapSeq = 0; // benzersiz lap id sayacı
  }

  /**
   * Kronometreyi başlatır
   */
  start() {
    if (!this.isRunning) {
      this.isRunning = true;
      const now = Date.now();
      this.startTime = now - this.elapsedTime;
      this.lapStartTime = now - (this.laps.length > 0 ? this.laps[this.laps.length - 1].totalTime : 0);
      
      // Her 100ms'de bir güncelleme yap
      this.intervalId = setInterval(() => {
        this.update();
      }, 100);
      
      this.eventEmitter.emit('start');
    }
  }

  /**
   * Kronometreyi durdurur
   */
  stop() {
    if (this.isRunning) {
      this.isRunning = false;
      clearInterval(this.intervalId);
      this.elapsedTime = Date.now() - this.startTime;
      this.eventEmitter.emit('stop', this.formatTime(this.elapsedTime));
    }
  }

  /**
   * Kronometreyi sıfırlar
   */
  reset() {
    this.stop();
    this.elapsedTime = 0;
    this.laps = [];
    this.eventEmitter.emit('reset');
    this.eventEmitter.emit('timeUpdate', this.formatTime(0));
  }

  /**
   * Yeni bir tur ekler
   * @param {string} note - Tur notu
   * @returns {Object} Eklenen tur bilgisi
   */
  addLap(note = '') {
    if (this.isRunning) {
      const now = Date.now();
      const totalTime = now - this.startTime;
      const lapTime = now - this.lapStartTime;
      
      const random = Math.random().toString(36).slice(2, 8);
      const lapId = `${now}-${this._lapSeq++}-${random}`; // daha güçlü benzersiz id: timestamp + counter + random
      const lap = {
        id: lapId,
        lapTime: lapTime,
        totalTime: totalTime,
        lapDate: new Date().toISOString(),
        note: note
      };
      
      this.laps.push(lap);
      this.lapStartTime = now;
      
      this.eventEmitter.emit('lap', lap);
      return lap;
    }
    return null;
  }

  /**
   * Kronometre durumunu günceller
   */
  update() {
    if (this.isRunning) {
      const currentTime = Date.now() - this.startTime;
      this.eventEmitter.emit('timeUpdate', this.formatTime(currentTime));
    }
  }

  /**
   * Milisaniye cinsinden zamanı formatlar (HH:MM:SS.MS)
   * @param {number} timeInMs - Milisaniye cinsinden zaman
   * @returns {string} Formatlanmış zaman
   */
  formatTime(timeInMs) {
    const ms = timeInMs % 1000;
    const seconds = Math.floor(timeInMs / 1000) % 60;
    const minutes = Math.floor(timeInMs / (1000 * 60)) % 60;
    const hours = Math.floor(timeInMs / (1000 * 60 * 60));
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${Math.floor(ms / 10).toString().padStart(2, '0')}`;
  }

  /**
   * Milisaniye cinsinden zamanı HH:MM:SS formatına çevirir (DB için)
   * @param {number} timeInMs
   */
  formatTimeHMS(timeInMs) {
    const seconds = Math.floor(timeInMs / 1000) % 60;
    const minutes = Math.floor(timeInMs / (1000 * 60)) % 60;
    const hours = Math.floor(timeInMs / (1000 * 60 * 60));
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Mevcut toplam süre (ms) - çalışıyorsa canlı, değilse son durdurulan süre
   */
  getCurrentTotalMs() {
    return this.isRunning ? (Date.now() - this.startTime) : this.elapsedTime;
  }

  /**
   * Olay dinleyicisi ekler
   * @param {string} event - Olay adı ('start', 'stop', 'reset', 'lap', 'timeUpdate')
   * @param {Function} listener - Olay dinleyici fonksiyonu
   */
  on(event, listener) {
    this.eventEmitter.on(event, listener);
  }

  /**
   * Olay dinleyicisini kaldırır
   * @param {string} event - Olay adı
   * @param {Function} listener - Kaldırılacak dinleyici fonksiyonu
   */
  off(event, listener) {
    this.eventEmitter.removeListener(event, listener);
  }

  /**
   * Mevcut kronometre durumunu döndürür
   * @returns {Object} Kronometre durumu
   */
  getState() {
    return {
      isRunning: this.isRunning,
      currentTime: this.isRunning ? Date.now() - this.startTime : this.elapsedTime,
      formattedTime: this.formatTime(this.isRunning ? Date.now() - this.startTime : this.elapsedTime),
      laps: this.laps
    };
  }
}

// Singleton instance
export default new StopwatchService();