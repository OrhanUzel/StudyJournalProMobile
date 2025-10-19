import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
let Notifications = null;
try {
  // Dynamic require to avoid breaking web/dev if not installed
  Notifications = require('expo-notifications');
} catch (e) {
  Notifications = null;
}

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

const PERSIST_KEY = 'stopwatch_state_v1';

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
    this.inactivityNotificationId = null;
  }

  async initialize() {
    try {
      const saved = await AsyncStorage.getItem(PERSIST_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        this.isRunning = !!state.isRunning;
        this.startTime = Number(state.startTime) || 0;
        this.elapsedTime = Number(state.elapsedTime) || 0;
        this.laps = Array.isArray(state.laps) ? state.laps : [];
        this._lapSeq = this.laps.length; // devam eden sıra

        if (this.isRunning && this.startTime > 0) {
          // Çalışmayı kaldığı yerden devam ettir
          if (!this.intervalId) {
            this.intervalId = setInterval(() => this.update(), 10);
          }
          this.lapStartTime = Date.now() - (this.laps.length > 0 ? this.laps[this.laps.length - 1].totalTime : 0);
          // İlk zaman bilgisini yayınla
          this.eventEmitter.emit('timeUpdate', this.formatTime(Date.now() - this.startTime));
        } else {
          // Durdurulmuş durumda: son süreyi yayınla
          this.eventEmitter.emit('timeUpdate', this.formatTime(this.elapsedTime));
        }
      }
    } catch (e) {
      // Yoksay: persist hatası UI'ı bloklamamalı
    }
  }

  async persistState() {
    try {
      const state = {
        isRunning: this.isRunning,
        startTime: this.startTime,
        elapsedTime: this.isRunning ? (Date.now() - this.startTime) : this.elapsedTime,
        laps: this.laps,
      };
      await AsyncStorage.setItem(PERSIST_KEY, JSON.stringify(state));
    } catch (e) {
      // sessizce geç
    }
  }

  async ensureNotificationPermission() {
    if (!Notifications || Platform.OS === 'web') return false;
    try {
      const settings = await Notifications.getPermissionsAsync();
      if (settings.status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync();
        return req.status === 'granted';
      }
      return true;
    } catch {
      return false;
    }
  }

  async scheduleInactivityReminder(minutes = 1) {
    if (!Notifications || Platform.OS === 'web') return;
    const granted = await this.ensureNotificationPermission();
    if (!granted) return;
    try {
      const triggerSeconds = minutes * 60;
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Çalışma süreniz devam ediyor',
          body: 'Hâlâ çalışıyor musunuz? Belirlenen süre boyunca tur yapılmadı.',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: { seconds: triggerSeconds, channelId: 'inactivity' },
      });
      this.inactivityNotificationId = id;
    } catch (e) {
      // sessiz
    }
  }

  async cancelInactivityReminder() {
    if (!Notifications || !this.inactivityNotificationId) return;
    try {
      await Notifications.cancelScheduledNotificationAsync(this.inactivityNotificationId);
      this.inactivityNotificationId = null;
    } catch {}
  }

  /**
   * Kronometreyi başlatır
   */
  async start() {
    if (!this.isRunning) {
      this.isRunning = true;
      const now = Date.now();
      this.startTime = now - this.elapsedTime;
      this.lapStartTime = now - (this.laps.length > 0 ? this.laps[this.laps.length - 1].totalTime : 0);
      
      this.intervalId = setInterval(() => {
        this.update();
      }, 10);
      
      this.eventEmitter.emit('start');
      await this.persistState();
      await this.cancelInactivityReminder();
      //await this.scheduleInactivityReminder(1);
    }
  }

  /**
   * Kronometreyi durdurur
   */
  async stop() {
    if (this.isRunning) {
      this.isRunning = false;
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.elapsedTime = Date.now() - this.startTime;
      this.eventEmitter.emit('stop', this.formatTime(this.elapsedTime));
      await this.persistState();
      await this.cancelInactivityReminder();
    }
  }

  /**
   * Kronometreyi sıfırlar
   */
  async reset() {
    await this.stop();
    this.elapsedTime = 0;
    this.laps = [];
    this._lapSeq = 0;
    this.eventEmitter.emit('reset');
    this.eventEmitter.emit('timeUpdate', this.formatTime(0));
    await this.persistState();
    await this.cancelInactivityReminder();
  }

  /**
   * Yeni bir tur ekler
   * @param {string} note - Tur notu
   * @returns {Object} Eklenen tur bilgisi
   */
  async addLap(note = '') {
    if (this.isRunning) {
      const now = Date.now();
      const totalTime = now - this.startTime;
      const lapTime = now - this.lapStartTime;
      
      const random = Math.random().toString(36).slice(2, 8);
      const lapId = `${now}-${this._lapSeq++}-${random}`;
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
      await this.persistState();
      await this.cancelInactivityReminder();
      await this.scheduleInactivityReminder(5);
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