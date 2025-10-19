import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import DatabaseService from '../services/DatabaseService';
import { LapRecord } from '../models/RecordModels';

const RecordDetailScreen = ({ route, navigation }) => {
  const { recordId } = route.params;
  const { theme } = useTheme();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dailyNote, setDailyNote] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [manualDuration, setManualDuration] = useState('');
  const [manualEndTime, setManualEndTime] = useState('');
  const [manualNote, setManualNote] = useState('');

  // Kayıt detaylarını yükle
  useEffect(() => {
    loadRecordDetails();
  }, [recordId]);

  // Seanslara göre turları grupla
  const groupSessions = (laps) => {
    if (!laps || laps.length === 0) return [];
    const groups = [];
    let current = null;
    for (const lap of laps) {
      const si = lap.sessionIndex || 1;
      if (!current || current.sessionIndex !== si) {
        current = { sessionIndex: si, items: [] };
        groups.push(current);
      }
      current.items.push(lap);
    }
    return groups;
  };

  const handleAddManualSession = async () => {
    if (!/^\d{2}:\d{2}:\d{2}$/.test(manualDuration)) {
      Alert.alert('Hata', 'Süre biçimi HH:MM:SS olmalı.');
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(manualEndTime)) {
      Alert.alert('Hata', 'Bitiş saati biçimi HH:MM olmalı.');
      return;
    }
    try {
      const nextSessionIndex = (await DatabaseService.getMaxSessionIndex(record.id)) + 1;
      // Gün + bitiş saati -> lapDate
      const endLocal = new Date(`${record.day}T${manualEndTime}:00`);
      const lapRecord = new LapRecord(
        null,
        endLocal.toISOString(),
        manualDuration,
        manualDuration,
        manualNote || '',
        nextSessionIndex
      );
      await DatabaseService.addLapRecord(lapRecord, record.id, nextSessionIndex);
      await DatabaseService.recomputeTotalTimeForDay(record.id);
      await loadRecordDetails();
      setManualDuration('');
      setManualEndTime('');
      setManualNote('');
      Alert.alert('Başarılı', 'Manuel seans eklendi.');
    } catch (error) {
      Alert.alert('Hata', 'Manuel seans eklenemedi: ' + error.message);
    }
  };

  const loadRecordDetails = async () => {
    setLoading(true);
    try {
      const dailyRecord = await DatabaseService.getDailyRecordWithLaps(recordId);
      setRecord(dailyRecord);
      setDailyNote(dailyRecord.dailyNote || '');
    } catch (error) {
      Alert.alert('Hata', 'Kayıt detayları yüklenirken bir hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Notu güncelle
  const handleUpdateNote = async () => {
    try {
      const updatedRecord = { ...record, dailyNote };
      await DatabaseService.updateDailyRecord(updatedRecord);
      setIsEditing(false);
      Alert.alert('Başarılı', 'Not güncellendi.');
    } catch (error) {
      Alert.alert('Hata', 'Not güncellenirken bir hata oluştu: ' + error.message);
    }
  };

  // Tarih formatla
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Saat formatla
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const hmsToMs = (hms) => {
    if (!hms || typeof hms !== 'string') return 0;
    const [h, m, s] = hms.split(':').map(Number);
    return ((h || 0) * 3600 + (m || 0) * 60 + (s || 0)) * 1000;
  };

  // Tur öğesi render fonksiyonu
  const renderLapItem = ({ item, index }) => {
    const isEven = index % 2 === 0;
    const endDate = new Date(item.lapDate);
    const startDate = new Date(endDate.getTime() - hmsToMs(item.duration));
    
    return (
      <View style={[
        styles.lapItem, 
        { backgroundColor: isEven ? theme.cardBackground : theme.background }
      ]}>
        <View style={styles.lapHeader}>
          <Text style={[styles.lapNumber, { color: theme.textColor }]}>
            Tur {index + 1}
          </Text>
          <Text style={[styles.lapTime, { color: theme.accentColor }]}>
            {item.duration}
          </Text>
        </View>
        
        <View style={styles.lapDetails}>
          <View style={styles.lapTimeInfo}>
            <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
            <Text style={[styles.lapTotalTime, { color: theme.textSecondary }]}>Toplam: {item.totalTime}</Text>
            <Text style={[styles.lapDateTime, { color: theme.textSecondary }]}>Başlangıç: {startDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</Text>
            <Text style={[styles.lapDateTime, { color: theme.textSecondary }]}>Bitiş: {formatTime(item.lapDate)}</Text>
          </View>
          
          {item.note ? (
            <Text style={[styles.lapNote, { color: theme.textColor }]}>
              {item.note}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primaryColor} />
      </View>
    );
  }

  if (!record) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
        <Ionicons name="alert-circle-outline" size={64} color={theme.dangerColor} />
        <Text style={[styles.errorText, { color: theme.textColor }]}>
          Kayıt bulunamadı
        </Text>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.primaryColor }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Başlık */}
      <View style={styles.header}>
        <Text style={[styles.headerDate, { color: theme.textColor }]}>
          {formatDate(record.day)}
        </Text>
        <View style={styles.timeContainer}>
          <Ionicons name="time-outline" size={20} color={theme.accentColor} />
          <Text style={[styles.totalTime, { color: theme.textColor }]}>
            {record.totalTimeForDay}
          </Text>
        </View>
      </View>

      {/* Not Bölümü */}
      <View style={[styles.noteSection, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.noteSectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textColor }]}>
            Günlük Not
          </Text>
          <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
            <Ionicons 
              name={isEditing ? "close-outline" : "create-outline"} 
              size={22} 
              color={theme.primaryColor} 
            />
          </TouchableOpacity>
        </View>
        
        {isEditing ? (
          <View style={styles.editNoteContainer}>
            <TextInput
              style={[styles.noteInput, { color: theme.textColor, borderColor: theme.borderColor }]}
              value={dailyNote}
              onChangeText={setDailyNote}
              multiline
              placeholder="Not ekleyin..."
              placeholderTextColor={theme.textSecondary}
            />
            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: theme.primaryColor }]}
              onPress={handleUpdateNote}
            >
              <Text style={styles.saveButtonText}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={[styles.noteText, { color: theme.textColor }]}>
            {record.dailyNote || "Not eklenmemiş"}
          </Text>
        )}
      </View>

      {/* Manuel Seans Ekle */}
      <View style={[styles.manualSection, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.sectionTitle, { color: theme.textColor }]}>Manuel Seans Ekle</Text>
        <View style={styles.manualRow}>
          <TextInput
            style={[styles.manualInput, { color: theme.textColor, borderColor: theme.borderColor }]}
            placeholder="HH:MM:SS"
            placeholderTextColor={theme.textSecondary}
            value={manualDuration}
            onChangeText={setManualDuration}
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.manualInput, { color: theme.textColor, borderColor: theme.borderColor }]}
            placeholder="Bitiş (HH:MM)"
            placeholderTextColor={theme.textSecondary}
            value={manualEndTime}
            onChangeText={setManualEndTime}
            keyboardType="numeric"
            maxLength={5}
          />
          <TouchableOpacity
            style={[styles.manualAddButton, { backgroundColor: theme.primaryColor }]}
            onPress={handleAddManualSession}
          >
            <Text style={styles.manualAddButtonText}>Ekle</Text>
          </TouchableOpacity>
        </View>
        <View style={{ marginTop: 12 }}>
          <TextInput
            style={[styles.manualNoteInput, { color: theme.textColor, borderColor: theme.borderColor }]}
            placeholder="Seans notu (opsiyonel)"
            placeholderTextColor={theme.textSecondary}
            value={manualNote}
            onChangeText={setManualNote}
            multiline
          />
        </View>
      </View>

      {/* Turlar Bölümü */}
      <View style={styles.lapsSection}>
        <Text style={[styles.sectionTitle, { color: theme.textColor }]}>
          Turlar ({record.laps.length})
        </Text>
        
        {record.laps.length > 0 ? (
          groupSessions(record.laps).map((group) => (
            <View key={`session-${group.sessionIndex}`} style={styles.sessionSection}>
              <View style={styles.sessionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.textColor }]}>Seans {group.sessionIndex}</Text>
                <Text style={[styles.sessionCount, { color: theme.textSecondary }]}>{group.items.length} tur</Text>
              </View>
              <FlatList
                data={group.items}
                renderItem={renderLapItem}
                keyExtractor={(item, idx) => (item.id != null ? `lap-${item.id}` : `lap-${item.sessionIndex}-${item.lapDate}-${idx}`)}
                scrollEnabled={false}
              />
            </View>
          ))
        ) : (
          <View style={styles.emptyLapsContainer}>
            <Text style={[styles.emptyLapsText, { color: theme.textSecondary }]}>Bu kayıtta tur bulunmuyor</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    marginTop: 12,
    marginBottom: 24,
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  header: {
    marginBottom: 20,
  },
  headerDate: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalTime: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  noteSection: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  noteSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  noteText: {
    lineHeight: 20,
  },
  editNoteContainer: {
    marginTop: 8,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  saveButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  lapsSection: {
    marginBottom: 20,
  },
  sessionSection: {
    marginTop: 12,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sessionCount: {
    fontSize: 12,
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
  lapTimeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lapTotalTime: {
    marginLeft: 4,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  lapDateTime: {
    marginLeft: 8,
    fontSize: 12,
  },
  lapNote: {
    marginTop: 8,
    fontStyle: 'italic',
  },
  emptyLapsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyLapsText: {
    fontSize: 16,
  },
  manualSection: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  manualInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginRight: 10,
  },
  manualAddButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  manualAddButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  manualNoteInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 60,
    textAlignVertical: 'top',
  }
});

export default RecordDetailScreen;