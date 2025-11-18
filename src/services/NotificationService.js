import { Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import StopwatchService from './StopwatchService';
import DatabaseService from './DatabaseService';
import translations from '../i18n/translations';

let Notifications = null;

// Lazy load expo-notifications safely (no-op on web and Expo Go)
const getNotifications = () => {
  if (Notifications) return Notifications;
  // Web'de bildirim kullanma
  if (Platform.OS === 'web') return null;
  try {
    Notifications = require('expo-notifications');
    return Notifications;
  } catch (e) {
    Notifications = null;
    return null;
  }
};

const CATEGORY_ID = 'STOPWATCH_SIMPLE';
const CHANNEL_ID = 'stopwatch';

class NotificationService {
  constructor() {
    this.initialized = false;
    this.currentNotificationId = null;
    this._responseSub = null;
    this._appStateSub = null;
    this._lastAppState = 'active';
    this._tickerId = null;
    this._lastSecond = null;
    this._onTimeUpdate = null;
    this._onStart = null;
    this._onStop = null;
  }

  async initialize() {
    const N = getNotifications();
    if (!N) return;

    try {
      // İzinleri iste (Android 13+ ve iOS)
      const granted = await this.ensureNotificationPermission();
      if (!granted) {
        // İzin verilmediyse devam etme
        return;
      }

      // Bildirim handler (gösterim davranışı)
      try {
        N.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: false,
            shouldSetBadge: false,
          }),
        });
      } catch {}

      // Android channel (idempotent)
      if (Platform.OS === 'android' && N.setNotificationChannelAsync) {
        try {
          await N.setNotificationChannelAsync(CHANNEL_ID, {
            name: 'Stopwatch',
            importance: N.AndroidImportance.DEFAULT,
            lockscreenVisibility: N.AndroidNotificationVisibility.PUBLIC,
            vibrationPattern: [0],
            sound: null,
          });
        } catch {}
      }

      // Native push modül entegrasyonu kaldırıldı (yalnızca expo-notifications kullanılacak)

      // Aksiyon dinleyicileri kaldırıldı (sade, kapatılabilir bildirim)

      // AppState -> keep/dismiss ongoing notification
      if (!this._appStateSub) {
        this._appStateSub = AppState.addEventListener('change', async (state) => {
          try {
            this._lastAppState = state;
            if (state === 'background' || state === 'inactive') {
              const st = StopwatchService.getState();
              if (st.isRunning) {
                await this.showStopwatchNotification();
              }
            } else if (state === 'active') {
              await this.dismissStopwatchNotification();
            }
          } catch {}
        });
      }

      // Kronometre güncellemeleri: artık süre göstermediğimiz için bildirim içerik güncellemesi gereksiz
      if (!this._onTimeUpdate) {
        this._onTimeUpdate = () => {};
        StopwatchService.on('timeUpdate', this._onTimeUpdate);
      }

      if (!this._onStart) {
        this._onStart = async () => {
          try {
            if (this._lastAppState !== 'active') {
              await this.showStopwatchNotification();
            }
          } catch {}
        };
        StopwatchService.on('start', this._onStart);
      }

      if (!this._onStop) {
        this._onStop = async () => {
          try {
            await this.dismissStopwatchNotification();
          } catch {}
        };
        StopwatchService.on('stop', this._onStop);
      }

      this.initialized = true;

      // Uygulama aktif durumda açıldığında, önceki kalmış bildirimi temizle
      try {
        if (AppState.currentState === 'active') {
          await this.dismissStopwatchNotification();
        }
      } catch {}
    } catch {
      // silent
    }
  }

  async ensureNotificationPermission() {
    const N = getNotifications();
    if (!N) return false;
    try {
      const settings = await N.getPermissionsAsync();
      if (settings?.status !== 'granted') {
        const req = await N.requestPermissionsAsync();
        return req?.status === 'granted';
      }
      return true;
    } catch {
      return false;
    }
  }

  async showStopwatchNotification() {
    const N = getNotifications();
    if (!N) return;
    try {
      const granted = await this.ensureNotificationPermission();
      if (!granted) return;
      // Yerelleştirme: dil tercihini AsyncStorage'dan al ve çeviriyi uygula
      let lang = 'tr';
      try {
        const stored = await AsyncStorage.getItem('languagePreference');
        if (stored && (stored === 'tr' || stored === 'en')) lang = stored;
      } catch {}
      const dict = translations[lang] || translations.tr || translations.en || {};
      const title = dict['notification.stopwatch_ongoing_title'] || 'Study in progress';
      const body = dict['notification.stopwatch_ongoing_body'] || 'Tap to return to the app';

      // If a previous exists, replace by dismissing and re-presenting
      if (this.currentNotificationId) {
        try { await N.dismissNotificationAsync(this.currentNotificationId); } catch {}
        this.currentNotificationId = null;
      }

      let id;
      if (typeof N.presentNotificationAsync === 'function') {
        console.log('Bildirim sunum yöntemi: presentNotificationAsync');
        id = await N.presentNotificationAsync({
          title,
          body,
          sound: false,
          android: { channelId: CHANNEL_ID, priority: 'default' },
        });
      } else {
        console.log('Bildirim sunum yöntemi: scheduleNotificationAsync(trigger:null)');
        id = await N.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: { type: 'stopwatch' },
            sound: false,
          },
          trigger: null,
        });
      }
      this.currentNotificationId = id;
    } catch {}
  }

  async updateStopwatchNotification() {
    // Süre göstermediğimiz için arka planda tekrar sunmaya gerek yok.
    // Yine de idempotent olarak, mevcut bildirimi olduğu gibi tut.
    return;
  }

  async dismissStopwatchNotification() {
    const N = getNotifications();
    if (!N) return;
    try {
      if (this.currentNotificationId) {
        await N.dismissNotificationAsync(this.currentNotificationId);
        this.currentNotificationId = null;
      } else {
        await N.dismissAllNotificationsAsync();
      }
    } catch {}
  }

  startTicker() {
    // Sade bildirimde süre güncellemesi yok; ticker'a gerek yok.
    return;
  }

  stopTicker() {
    try {
      if (this._tickerId) {
        clearInterval(this._tickerId);
        this._tickerId = null;
      }
    } catch {}
  }

  async saveCurrentSessionToDatabase() {
    // Replicates save logic from StopwatchScreen (no UI)
    const state = StopwatchService.getState();
    const currentTotalMs = state.currentTime || 0;
    if (currentTotalMs <= 0) return;

    const sourceLaps = Array.isArray(state.laps) ? [...state.laps] : [];
    const planned = [...sourceLaps];
    const lastTotal = sourceLaps.length > 0 ? sourceLaps[sourceLaps.length - 1].totalTime : 0;

    if (sourceLaps.length === 0) {
      planned.push({
        id: `pending-${Date.now()}`,
        lapTime: currentTotalMs,
        totalTime: currentTotalMs,
        lapDate: new Date().toISOString(),
        note: ''
      });
    } else if (currentTotalMs > lastTotal) {
      planned.push({
        id: `pending-${Date.now()}`,
        lapTime: currentTotalMs - lastTotal,
        totalTime: currentTotalMs,
        lapDate: new Date().toISOString(),
        note: ''
      });
    }

    if (planned.length === 0) return;

    // Persist to DB with a new session index for today
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const dailyRecordId = await DatabaseService.getOrCreateDailyRecordForDay(today);
    const nextSessionIndex = (await DatabaseService.getMaxSessionIndex(dailyRecordId)) + 1;

    for (const lap of planned) {
      const lapRecord = {
        lapDate: lap.lapDate,
        duration: StopwatchService.formatTimeHMS(lap.lapTime),
        totalTime: StopwatchService.formatTimeHMS(lap.totalTime),
        note: lap.note || '',
        sessionIndex: nextSessionIndex,
      };
      await DatabaseService.addLapRecord(lapRecord, dailyRecordId, nextSessionIndex);
    }

    const total = await DatabaseService.recomputeTotalTimeForDay(dailyRecordId);
    const dailyRecord = await DatabaseService.getDailyRecordWithLaps(dailyRecordId);
    dailyRecord.totalTimeForDay = total;
    await DatabaseService.updateDailyRecord(dailyRecord);
  }
}

export default new NotificationService();