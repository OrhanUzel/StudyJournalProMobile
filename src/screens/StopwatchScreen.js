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
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import StopwatchService from '../services/StopwatchService';
import DatabaseService from '../services/DatabaseService';
import { DailyRecord, LapRecord } from '../models/RecordModels';

const StopwatchScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [time, setTime] = useState('00:00:00.00');
  const [laps, setLaps] = useState([]);
  const [lapNote, setLapNote] = useState('');
  const [dailyNote, setDailyNote] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [showSavePanel, setShowSavePanel] = useState(false);
  const [wasRunningBeforeSave, setWasRunningBeforeSave] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Kronometre servisini dinle
  useEffect(() => {
    // Zaman güncellemelerini dinle
    const onTimeUpdate = (formattedTime) => {
      setTime(formattedTime);
    };

    // Tur eklendiğinde dinle
    const onLap = (lap) => {
      setLaps(prevLaps => {
        // Duplicate guard: aynı id'ye sahip turu tekrar ekleme
        if (prevLaps.some(l => l.id === lap.id)) return prevLaps;
        return [...prevLaps, lap];
      });
    };

    // Sıfırlandığında dinle
    const onReset = () => {
      setLaps([]);
      setTime('00:00:00.00');
    };

    // Başlatıldığında dinle
    const onStart = () => {
      setIsRunning(true);
    };

    // Durdurulduğunda dinle
    const onStop = () => {
      setIsRunning(false);
    };

    StopwatchService.on('timeUpdate', onTimeUpdate);
    StopwatchService.on('lap', onLap);
    StopwatchService.on('reset', onReset);
    StopwatchService.on('start', onStart);
    StopwatchService.on('stop', onStop);

    // Mevcut durumu al
    const state = StopwatchService.getState();
    setTime(state.formattedTime);
    setLaps(state.laps);
    setIsRunning(state.isRunning);

    // Temizlik fonksiyonu
    return () => {
      StopwatchService.off('timeUpdate', onTimeUpdate);
      StopwatchService.off('lap', onLap);
      StopwatchService.off('reset', onReset);
      StopwatchService.off('start', onStart);
      StopwatchService.off('stop', onStop);
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
      Alert.alert(
        'Kronometreyi Sıfırla',
        'Tüm turlar silinecek. Devam etmek istiyor musunuz?',
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Sıfırla', onPress: () => StopwatchService.reset(), style: 'destructive' }
        ]
      );
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
      Alert.alert('Hata', 'Kaydedilecek tur bulunamadı.');
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];

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

      // Günlük notu (varsa) birleştir ve toplamı yeniden hesapla
      const dailyRecord = await DatabaseService.getDailyRecordWithLaps(dailyRecordId);
      const mergedNote = dailyRecord.dailyNote ? `${dailyRecord.dailyNote}\n${dailyNote}` : dailyNote;
      dailyRecord.dailyNote = mergedNote;
      dailyRecord.totalTimeForDay = await DatabaseService.recomputeTotalTimeForDay(dailyRecordId);
      await DatabaseService.updateDailyRecord(dailyRecord);

      Alert.alert(
        'Başarılı',
        'Çalışma kaydedildi.',
        [{ text: 'Tamam', onPress: () => {
          setShowSavePanel(false);
          setDailyNote('');
          setLapNote('');
          StopwatchService.reset();
        }}]
      );
    } catch (error) {
      Alert.alert('Hata', 'Kayıt sırasında bir hata oluştu: ' + error.message);
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
            Tur {displayIndex}
          </Text>
          <Text style={[styles.lapTime, { color: theme.accentColor }]}>
            {StopwatchService.formatTime(item.lapTime)}
          </Text>
        </View>
        
        <View style={styles.lapDetails}>
          <Text style={[styles.lapTotalTime, { color: theme.textSecondary }]}>
            Toplam: {StopwatchService.formatTime(item.totalTime)}
          </Text>
          {item.note ? (
            <Text style={[styles.lapNote, { color: theme.textColor }]}>
              Not: {item.note}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Kronometre Ekranı */}
      <View style={styles.timerContainer}>
        <Text style={[styles.timerText, { color: theme.textColor }]}>
          {time}
        </Text>
      </View>

      {/* Kontrol Butonları */}
      <View style={styles.controlsContainer}>
        {/* Reset Butonu */}
        <TouchableOpacity 
          style={[styles.controlButton, { backgroundColor: theme.dangerColor }]} 
          onPress={handleReset}
        >
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Başlat/Durdur Butonu */}
        <TouchableOpacity 
          style={[
            styles.controlButton, 
            { backgroundColor: isRunning ? theme.warningColor : theme.successColor }
          ]} 
          onPress={isRunning ? handleStop : handleStart}
        >
          <Ionicons 
            name={isRunning ? "pause" : "play"} 
            size={24} 
            color="#fff" 
          />
        </TouchableOpacity>

        {/* Tur Butonu */}
        <TouchableOpacity 
          style={[
            styles.controlButton, 
            { backgroundColor: theme.accentColor, opacity: isRunning ? 1 : 0.5 }
          ]} 
          onPress={handleLap}
          disabled={!isRunning}
        >
          <Ionicons name="flag" size={24} color="#fff" />
        </TouchableOpacity>

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
          disabled={(laps.length === 0 && StopwatchService.getCurrentTotalMs() === 0)}
        >
          <Ionicons name="save" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tur Notu Girişi */}
      <View style={[styles.noteInputContainer, { backgroundColor: theme.cardBackground }]}>
        <TextInput
          style={[styles.noteInput, { color: theme.textColor, borderColor: theme.borderColor }]}
          placeholder="Tur notu ekleyin..."
          placeholderTextColor={theme.textSecondary}
          value={lapNote}
          onChangeText={setLapNote}
        />
      </View>

      {/* Turlar Listesi */}
      <View style={styles.lapsContainer}>
        <Text style={[styles.lapsTitle, { color: theme.textColor }]}>
          Turlar ({laps.length})
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
              Henüz tur kaydı yok
            </Text>
          </View>
        )}
      </View>

      {/* Kaydetme Paneli */}
      <Animated.View 
        style={[
          styles.savePanelContainer, 
          { 
            backgroundColor: theme.cardBackground,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            display: showSavePanel ? 'flex' : 'none'
          }
        ]}
      >
        <View style={styles.savePanelHeader}>
          <Text style={[styles.savePanelTitle, { color: theme.textColor }]}>
            Çalışmayı Kaydet
          </Text>
          <TouchableOpacity onPress={() => setShowSavePanel(false)}>
            <Ionicons name="close" size={24} color={theme.textColor} />
          </TouchableOpacity>
        </View>

        <TextInput
          style={[styles.dailyNoteInput, { color: theme.textColor, borderColor: theme.borderColor }]}
          placeholder="Günlük not ekleyin (isteğe bağlı)..."
          placeholderTextColor={theme.textSecondary}
          value={dailyNote}
          onChangeText={setDailyNote}
          multiline
        />

        <Text style={[styles.saveConfirmText, { color: theme.textColor }]}>Çalışma kaydedilsin mi?</Text>
        <View style={styles.saveActions}>
          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: theme.primaryColor, flex: 1, marginRight: 8 }]}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>Evet</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: theme.warningColor, flex: 1, marginLeft: 8 }]}
            onPress={handleCancelSave}
          >
            <Text style={styles.saveButtonText}>Hayır</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
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
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
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
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
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