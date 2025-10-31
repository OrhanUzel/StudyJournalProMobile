import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  TextInput, 
  Alert,
  Animated,
  Keyboard,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import StopwatchService from '../services/StopwatchService';
import DatabaseService from '../services/DatabaseService';
import { DailyRecord, LapRecord } from '../models/RecordModels';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';

// Salise etiketini bağımsız güncelleyen küçük bileşen
const HundredthsTicker = React.memo(({ isRunning, color, coarseTime }) => {
  const [hundredths, setHundredths] = useState('00');

  useEffect(() => {
    let rafId;
    let lastHund = -1;

    const update = () => {
      const ms = StopwatchService.getCurrentTotalMs();
      const hundNum = Math.floor((ms % 1000) / 10);
      if (hundNum !== lastHund) {
        lastHund = hundNum;
        setHundredths(hundNum.toString().padStart(2, '0'));
      }
      rafId = requestAnimationFrame(update);
    };

    if (isRunning) {
      update();
    } else {
      // Not running: recompute on mount and when coarseTime changes (rehydrate)
      const ms = StopwatchService.getCurrentTotalMs();
      const hundNum = Math.floor((ms % 1000) / 10);
      setHundredths(hundNum.toString().padStart(2, '0'));
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isRunning, coarseTime]);

  useEffect(() => {
    if (coarseTime === '00:00:00') {
      setHundredths('00');
    }
  }, [coarseTime]);

  return (
    <View style={[styles.timeSegment, styles.hundredthsSegment]}>
      <Text style={[styles.hundredthsText, { color }]}>{hundredths}</Text>
    </View>
  );
});

// Tekil zaman parçalarını (saat/dakika/saniye) gösteren küçük bileşen
const TimerSegment = React.memo(({ value, label, color }) => {
  return (
    <View style={styles.timeSegment}>
      <Text style={[styles.timerText, { color }]}>{value}</Text>
      <Text style={[
        styles.segmentLabel,
        { color },
      ]}>{label}</Text>
    </View>
  );
});

const Separator = React.memo(({ char, color, gap = 6, vGap = 6 }) => {
  if (char === ':') {
    const dotSize = Platform.OS === 'web' ? 6 : 7;
    const lineHeight = Platform.OS === 'web' ? 56 : 58; // numeric height (mobile biraz daha büyük)
    const innerVGap = Platform.OS === 'web' ? vGap : Math.max(2, vGap - 2);
    const paddingVertical = Math.max(0, (lineHeight - (dotSize * 2 + innerVGap)) / 2);
    const adjustY = Platform.OS === 'web' ? -10 : -6; // mobilde biraz daha az yukarı taşı
    return (
      <View style={[styles.separator, { marginHorizontal: gap }]}> 
        <View style={[styles.colonContainer, { height: lineHeight, justifyContent: 'space-between', paddingVertical, transform: [{ translateY: adjustY }] }]}> 
          <View style={[styles.colonDot, { width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: color, opacity: 0.6 }]} />
          <View style={[styles.colonDot, { width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: color, opacity: 0.6 }]} />
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.separator, { marginHorizontal: gap }]}>
      <Text style={[styles.separatorText, { color, opacity: 0.6 }]}>{char}</Text>
    </View>
  );
});

const StopwatchScreen = ({ navigation }) => {
  const { theme, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const [coarseTime, setCoarseTime] = useState('00:00:00');
  const [laps, setLaps] = useState([]);
  const [lapNote, setLapNote] = useState('');
  const [dailyNote, setDailyNote] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [showSavePanel, setShowSavePanel] = useState(false);
  const [wasRunningBeforeSave, setWasRunningBeforeSave] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [controlsTop, setControlsTop] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Kronometre servisini dinle
  useEffect(() => {
    let onTimeUpdate, onLap, onReset, onStart, onStop;

    const init = async () => {
      await StopwatchService.initialize();

      // Zaman güncellemelerini dinle (HH:MM:SS sadece değiştiğinde güncelle)
      onTimeUpdate = () => {
        const ms = StopwatchService.getCurrentTotalMs();
        const hms = StopwatchService.formatTimeHMS(ms);
        setCoarseTime(prev => (prev !== hms ? hms : prev));
      };

      // Tur eklendiğinde dinle
      onLap = (lap) => {
        setLaps(prevLaps => {
          if (prevLaps.some(l => l.id === lap.id)) return prevLaps;
          return [...prevLaps, lap];
        });
      };

      // Sıfırlandığında dinle
      onReset = () => {
        setLaps([]);
        setCoarseTime('00:00:00');
        setIsRunning(false);
      };

      // Başlatıldığında/durdurulduğunda dinle
      onStart = () => setIsRunning(true);
      onStop = () => setIsRunning(false);

      StopwatchService.on('timeUpdate', onTimeUpdate);
      StopwatchService.on('lap', onLap);
      StopwatchService.on('reset', onReset);
      StopwatchService.on('start', onStart);
      StopwatchService.on('stop', onStop);

      // Mevcut durumu al (initialize sonrası)
      const state = StopwatchService.getState();
      setCoarseTime(StopwatchService.formatTimeHMS(StopwatchService.getCurrentTotalMs()));
      setLaps(state.laps);
      setIsRunning(state.isRunning);
    };

    init();

    // Temizlik
    return () => {
      if (onTimeUpdate) StopwatchService.off('timeUpdate', onTimeUpdate);
      if (onLap) StopwatchService.off('lap', onLap);
      if (onReset) StopwatchService.off('reset', onReset);
      if (onStart) StopwatchService.off('start', onStart);
      if (onStop) StopwatchService.off('stop', onStop);
    };
  }, []);

  // Kaydetme panelini göster/gizle
  useEffect(() => {
    if (showSavePanel) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [showSavePanel, fadeAnim, slideAnim]);

  // Kronometreyi başlat
  const handleStart = () => {
    StopwatchService.start();
  };

  // Kronometreyi durdur
  const handleStop = () => {
    StopwatchService.stop();
  };

  // Kronometreyi sıfırla
  const handleReset = () => {
    if (laps.length > 0) {
      setShowResetConfirm(true);
    } else {
      StopwatchService.reset();
    }
  };

  // Yeni tur ekle
  const handleLap = () => {
    if (isRunning) {
      const lap = StopwatchService.addLap(lapNote);
      if (lap) {
        setLapNote(''); // Not alanını temizle
        Keyboard.dismiss();
      }
    }
  };

  // Kaydetmeden önce son çalışılan segmenti tur olarak ekle
  const buildSaveLaps = () => {
    const currentTotalMs = StopwatchService.getCurrentTotalMs();
    if (currentTotalMs <= 0) return [];

    const sourceLaps = [...laps];

    // Eğer tur notu girildiyse, son turun notu olarak ata
    if (lapNote && sourceLaps.length > 0) {
      const lastIndex = sourceLaps.length - 1;
      const last = sourceLaps[lastIndex];
      sourceLaps[lastIndex] = { ...last, note: lapNote };
    }

    const saveLaps = [...sourceLaps];
    const lastTotal = sourceLaps.length > 0 ? sourceLaps[sourceLaps.length - 1].totalTime : 0;

    if (sourceLaps.length === 0) {
      // hiç tur yoksa, tamamı bir tur olarak kaydedilsin
      saveLaps.push({
        id: `pending-${Date.now()}`,
        lapTime: currentTotalMs,
        totalTime: currentTotalMs,
        lapDate: new Date().toISOString(),
        note: lapNote || ''
      });
    } else if (currentTotalMs > lastTotal) {
      // son turdan bu yana çalışılan süreyi ek tur olarak kaydet
      saveLaps.push({
        id: `pending-${Date.now()}`,
        lapTime: currentTotalMs - lastTotal,
        totalTime: currentTotalMs,
        lapDate: new Date().toISOString(),
        note: lapNote || ''
      });
    }

    return saveLaps;
  };

  // Günlük kaydı kaydet
  const handleSave = async () => {
    const plannedLaps = buildSaveLaps();
    if (plannedLaps.length === 0) {
      Alert.alert(t('common.error'), t('stopwatch.no_laps_to_save'));
      return;
    }

    try {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

      // Günlük kayıt: aynı gün için tek bir alan
      const dailyRecordId = await DatabaseService.getOrCreateDailyRecordForDay(today);
      const nextSessionIndex = (await DatabaseService.getMaxSessionIndex(dailyRecordId)) + 1;

      // Turları kaydet (bu oturum için session index)
      for (const lap of plannedLaps) {
        const lapRecord = new LapRecord(
          null,
          lap.lapDate,
          StopwatchService.formatTimeHMS(lap.lapTime),
          StopwatchService.formatTimeHMS(lap.totalTime),
          lap.note,
          nextSessionIndex
        );
        await DatabaseService.addLapRecord(lapRecord, dailyRecordId, nextSessionIndex);
      }

      // Toplamı yeniden hesapla; günlük notu değiştirme
      const dailyRecord = await DatabaseService.getDailyRecordWithLaps(dailyRecordId);
      dailyRecord.totalTimeForDay = await DatabaseService.recomputeTotalTimeForDay(dailyRecordId);
      await DatabaseService.updateDailyRecord(dailyRecord);

      setShowSavePanel(false);
      setDailyNote('');
      setLapNote('');
      StopwatchService.reset();
      setToastMessage(t('stopwatch.saved'));
      setShowToast(true);
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  const handleCancelSave = () => {
    setShowSavePanel(false);
    if (wasRunningBeforeSave) {
      handleStart();
    }
  };

  // Tur öğesi render fonksiyonu
  const renderLapItem = ({ item, index }) => {
    const isEven = index % 2 === 0;
    const displayIndex = laps.length - index; // reverse edildiği için görünür sıra
    
    return (
      <View style={[
        styles.lapItem, 
        { backgroundColor: isEven ? theme.cardBackground : theme.background }
      ]}>
        <View style={styles.lapHeader}>
          <Text style={[styles.lapNumber, { color: theme.textColor }]}>
            {t('record.lap', { index: displayIndex })}
          </Text>
          <Text style={[styles.lapTime, { color: theme.accentColor }]}>
            {StopwatchService.formatTime(item.lapTime)}
          </Text>
        </View>
        
        <View style={styles.lapDetails}>
          <Text style={[styles.lapTotalTime, { color: theme.textSecondary }]}>
            {t('record.total')}: {StopwatchService.formatTime(item.totalTime)}
          </Text>
          {item.note ? (
            <Text style={[styles.lapNote, { color: theme.textColor }]}>
              {String(item.note).replace(/\\n/g, '\n')}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e) => {
      const height = e?.endCoordinates?.height || 0;
      setKeyboardHeight(height);
    };
    const onHide = () => setKeyboardHeight(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Kronometre Ekranı */}
      <View style={styles.timerContainer}>
        <View style={styles.timerRow}>
        {(() => {
          const [h, m, s] = coarseTime.split(':');
          const hoursInt = parseInt(h, 10) || 0;
          return (
            <>
              {hoursInt > 0 ? (
                <>
                  <TimerSegment value={h} label={t('stopwatch.hours_abbr')} color={theme.textColor} />
                  <Separator char=":" color={theme.textColor} />
                </>
              ) : null}
              <TimerSegment value={m} label={t('stopwatch.minutes_abbr')} color={theme.textColor} />
              <Separator char=":" color={theme.textColor} />
              <TimerSegment value={s} label={t('stopwatch.seconds_abbr')} color={theme.textColor} />
              <Separator char="." color={theme.textColor} gap={1} />
              <HundredthsTicker 
                isRunning={isRunning} 
                color={theme.textColor} 
                coarseTime={coarseTime}
              />
            </>
          );
        })()}
      </View>
      </View>

      {/* Kontrol Butonları */}
      {(!isRunning && coarseTime === '00:00:00' && laps.length === 0) ? (
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity 
            style={[styles.startWideButton, { backgroundColor: theme.successColor }]} 
            onPress={handleStart}
          >
            <Ionicons name="play" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.controlsContainer}>
          {/* Reset Butonu */}
          <TouchableOpacity 
            style={[styles.controlButton, { backgroundColor: theme.dangerColor }]} 
            onPress={handleReset}
            disabled={showSavePanel}
          >
            <Ionicons name="refresh" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Başlat/Durdur Butonu */}
          <TouchableOpacity 
            style={[
              styles.controlButton,
              !isRunning ? styles.startButtonStopped : null,
              { backgroundColor: isRunning ? theme.successColor : theme.successColor }
            ]}
            onPress={isRunning ? handleStop : handleStart}
            disabled={showSavePanel}
          >
            <Ionicons 
              name={isRunning ? "pause" : "play"} 
              size={24} 
              color="#fff" 
            />
          </TouchableOpacity>

          {/* Tur Butonu */}
          {isRunning && (
            <TouchableOpacity 
              style={[
                styles.controlButton, 
                { backgroundColor: theme.warningColor }
              ]} 
              onPress={handleLap}
              disabled={showSavePanel}
            >
              <Ionicons name="flag" size={24} color="#fff" />
            </TouchableOpacity>
          )}

          {/* Kaydet Butonu */}
          <TouchableOpacity 
            style={[
              styles.controlButton, 
              { backgroundColor: theme.primaryColor, opacity: (laps.length > 0 || StopwatchService.getCurrentTotalMs() > 0) ? 1 : 0.5 }
            ]} 
            onPress={() => {
              setWasRunningBeforeSave(isRunning);
              if (isRunning) handleStop();
              setShowSavePanel(true);
            }}
            disabled={(laps.length === 0 && StopwatchService.getCurrentTotalMs() === 0) || showSavePanel}
          >
            <Ionicons name="save" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Tur Notu Girişi */}
      <View style={[styles.noteInputContainer, { backgroundColor: theme.cardBackground }]}>
        <TextInput
          style={[styles.noteInput, { color: theme.textColor, borderColor: theme.borderColor }]}
          placeholder={t('stopwatch.lap_note_ph')}
          placeholderTextColor={theme.textSecondary}
          value={lapNote}
          onChangeText={setLapNote}
          editable={!showSavePanel}
        />
      </View>

      {/* Turlar Listesi */}
      <View style={styles.lapsContainer}>
        <Text style={[styles.lapsTitle, { color: theme.textColor }]}>
          {t('stopwatch.laps_title', { count: laps.length })}
        </Text>
        
        {laps.length > 0 ? (
          <FlatList
            data={[...laps].reverse()}
            renderItem={renderLapItem}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.lapsList}
          />
        ) : (
          <View style={styles.emptyLapsContainer}>
            <Ionicons name="time-outline" size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyLapsText, { color: theme.textSecondary }]}>
              {t('stopwatch.empty_laps')}
            </Text>
          </View>
        )}
      </View>

      {showSavePanel && (
        <View
          pointerEvents="auto"
          style={[
            styles.saveBackdrop,
            { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.25)' },
          ]}
        />
      )}

      {/* Kaydetme Paneli */}
      <Animated.View 
        style={[
          styles.savePanelContainer, 
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            display: showSavePanel ? 'flex' : 'none'
          }
        ]}
      >
        <View style={[styles.saveDialog, { backgroundColor: theme.cardBackground, marginTop: Math.max(controlsTop - 16, 0) }]}>
          <View style={styles.savePanelHeader}>
          <Text style={[styles.savePanelTitle, { color: theme.textColor }]}>
            {t('stopwatch.save_panel_title')}
          </Text>
          <TouchableOpacity onPress={handleCancelSave}>
            <Ionicons name="close" size={24} color={theme.textColor} />
          </TouchableOpacity>
        </View>



        <Text style={[styles.saveConfirmText, { color: theme.textColor }]}>{t('stopwatch.confirm_save')}</Text>
        <View style={styles.saveActions}>
          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: theme.successColor, flex: 1, marginRight: 8 }]}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>{t('common.yes')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: theme.warningColor, flex: 1, marginLeft: 8 }]}
            onPress={handleCancelSave}
          >
            <Text style={styles.saveButtonText}>{t('common.no')}</Text>
          </TouchableOpacity>
        </View>
         </View>
      </Animated.View>

      <ConfirmDialog
        visible={showResetConfirm}
        title={t('stopwatch.reset_title')}
        message={t('stopwatch.reset_body')}
        onCancel={() => setShowResetConfirm(false)}
        onConfirm={() => {
          setShowResetConfirm(false);
          StopwatchService.reset();
          setLapNote('');
        }}
      />

      <Toast
        visible={showToast}
        message={toastMessage}
        onHide={() => setShowToast(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: 30,
    
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 65,//56
    fontWeight: 'bold',
    includeFontPadding: false,
    fontVariant: ['tabular-nums'],
      

  },
  hundredthsText: {
    fontSize: 40,//32 idi
    fontWeight: 'bold',//bold
    includeFontPadding: false,
  },
  separator: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  separatorText: {
    fontSize: 40,
    fontWeight: 'normal',
    includeFontPadding: false,
    textAlign: 'center',
    lineHeight: 56,
    transform: [{ translateY: -2 }],
  },
  colonContainer: {
    height: 56,//56
    justifyContent: 'center',
    alignItems: 'center',
  },
  colonDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginVertical: 2,
  },
  timeSegment: {
    alignItems: 'center',
    justifyContent: 'center',
    //flex: 1, // Responsive genişlik
    paddingHorizontal: 4, // Minimal padding
    minWidth:85, // Sabit genişlik - label titreşimini önler //72//42 idi en son
  },
  hundredthsSegment: {
    marginLeft: 0,
  },
  segmentLabel: {
    marginTop: 4,
    fontSize: 14,
    opacity: 0.8,
    textAlign: 'center',
    width: '100%', // Label tam genişliği kaplar
    position: 'relative', // Responsive positioning
    includeFontPadding: false, // Bu satırı ekleyin

  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  startWideButton: {
    width: '80%',
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  startButtonStopped: {
    width: 120,
  },
  noteInputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  noteInput: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  addNoteButton: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  lapsContainer: {
    flex: 1,
  },
  lapsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  lapsList: {
    paddingBottom: 20,
  },
  lapItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  lapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  lapNumber: {
    fontWeight: 'bold',
  },
  lapTime: {
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  lapDetails: {
    marginTop: 4,
  },
  lapTotalTime: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  lapNote: {
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyLapsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyLapsText: {
    marginTop: 10,
    fontSize: 16,
  },
  savePanelContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  saveBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  saveDialog: {
    width: '100%',
    borderRadius: 20,
    padding: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  savePanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  savePanelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dailyNoteInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  saveConfirmText: {
    marginBottom: 10,
    fontSize: 14,
  },
  saveActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  saveButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default StopwatchScreen;