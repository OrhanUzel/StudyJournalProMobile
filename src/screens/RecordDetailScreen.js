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
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from '../components/Toast';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import DatabaseService from '../services/DatabaseService';
import { LapRecord } from '../models/RecordModels';

const RecordDetailScreen = ({ route, navigation }) => {
  const { recordId } = route.params;
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dailyNote, setDailyNote] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [manualDuration, setManualDuration] = useState('');
  const [manualEndTime, setManualEndTime] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [editingLapId, setEditingLapId] = useState(null);
  const [editingLapNote, setEditingLapNote] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

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
      Alert.alert(t('common.error'), t('record.duration_ph'));
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(manualEndTime)) {
      Alert.alert(t('common.error'), t('record.end_ph'));
      return;
    }
    try {
      const nextSessionIndex = (await DatabaseService.getMaxSessionIndex(record.id)) + 1;
      const [y, m, d] = String(record.day).split('-').map(Number);
      const [hh, mm] = String(manualEndTime).split(':').map(Number);
      const endLocal = new Date(y || 0, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0);
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
      setToastMessage(t('stopwatch.saved'));
      setShowToast(true);
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  const loadRecordDetails = async () => {
    setLoading(true);
    try {
      const dailyRecord = await DatabaseService.getDailyRecordWithLaps(recordId);
      setRecord(dailyRecord);
      setDailyNote(dailyRecord.dailyNote || '');
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  // Notu güncelle
  const handleUpdateNote = async () => {
    try {
      const updatedRecord = { ...record, dailyNote };
      await DatabaseService.updateDailyRecord(updatedRecord);
      await loadRecordDetails();
      setIsEditing(false);
      setToastMessage(t('stopwatch.saved'));
      setShowToast(true);
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  // Tarih formatla (gün alanını yerel zamanla yorumla)
  const formatDate = (dateString) => {
    const date = new Date(`${dateString}T00:00:00`);
    const locale = language === 'en' ? 'en-US' : 'tr-TR';
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Saat formatla
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const locale = language === 'en' ? 'en-US' : 'tr-TR';
    return date.toLocaleTimeString(locale, {
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
    const locale = language === 'en' ? 'en-US' : 'tr-TR';
    return (
      <View style={[
        styles.lapItem, 
        { backgroundColor: isEven ? theme.cardBackground : theme.background }
      ]}>
        <View style={styles.lapHeader}>
          <Text style={[styles.lapNumber, { color: theme.textColor }]}>
            {t('record.lap', { index: index + 1 })}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.lapTime, { color: theme.accentColor }]}>
              {item.duration}
            </Text>
            <TouchableOpacity onPress={() => { setEditingLapId(item.id); setEditingLapNote(item.note || ''); }}>
              <Ionicons name="create-outline" size={18} color={theme.primaryColor} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.lapDetails}>
          <View style={styles.lapTimeInfo}>
            <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
            <Text style={[styles.lapTotalTime, { color: theme.textSecondary }]}>{t('record.total')}: {item.totalTime}</Text>
            <Text style={[styles.lapDateTime, { color: theme.textSecondary }]}>{t('record.start')}: {startDate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</Text>
            <Text style={[styles.lapDateTime, { color: theme.textSecondary }]}>{t('record.end')}: {formatTime(item.lapDate)}</Text>
          </View>
          {editingLapId === item.id ? (
            <View style={{ marginTop: 8 }}>
              <TextInput
                style={[styles.manualNoteInput, { color: theme.textColor, borderColor: theme.borderColor }]}
                value={editingLapNote}
                onChangeText={setEditingLapNote}
                placeholder={t('stopwatch.lap_note_ph')}
                placeholderTextColor={theme.textSecondary}
                multiline
              />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity
                  style={[styles.manualAddButton, { backgroundColor: theme.primaryColor }]}
                  onPress={async () => {
                    try {
                      await DatabaseService.updateLapRecordNote(editingLapId, editingLapNote.trim());
                      await loadRecordDetails();
                      setEditingLapId(null);
                      setEditingLapNote('');
                      setToastMessage(t('stopwatch.saved'));
                      setShowToast(true);
                    } catch (error) {
                      Alert.alert(t('common.error'), error.message);
                    }
                  }}
                >
                  <Text style={styles.manualAddButtonText}>{t('record.save')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.manualAddButton, { backgroundColor: theme.borderColor }]}
                  onPress={() => { setEditingLapId(null); setEditingLapNote(''); }}
                >
                  <Text style={[styles.manualAddButtonText, { color: theme.textColor }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            item.note ? (
              <Text style={[styles.lapNote, { color: theme.textColor }]}>
                {String(item.note).replace(/\\n/g, '\n')}
              </Text>
            ) : null
          )}
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
          {t('record.not_found')}
        </Text>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.primaryColor }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>{t('record.go_back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0} style={{ flex: 1 }}>
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
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
            {t('record.daily_note')}
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
              placeholder={t('stopwatch.daily_note_ph')}
              placeholderTextColor={theme.textSecondary}
            />
            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: theme.primaryColor }]}
              onPress={handleUpdateNote}
            >
              <Text style={styles.saveButtonText}>{t('record.save')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={[styles.noteText, { color: theme.textColor }]}> 
            {record.dailyNote || t('record.no_note')}
          </Text>
        )}
      </View>

      {/* Manuel Seans Ekle */}
      <View style={[styles.manualSection, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.sectionTitle, { color: theme.textColor }]}>{t('record.manual_add')}</Text>
        <View style={styles.manualRow}>
          <TextInput
            style={[styles.manualInput, { color: theme.textColor, borderColor: theme.borderColor }]}
            placeholder={t('record.duration_ph')}
            placeholderTextColor={theme.textSecondary}
            value={manualDuration}
            onChangeText={setManualDuration}
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.manualInput, { color: theme.textColor, borderColor: theme.borderColor }]}
            placeholder={t('record.end_ph')}
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
            <Text style={styles.manualAddButtonText}>{t('record.add')}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ marginTop: 12 }}>
          <TextInput
            style={[styles.manualNoteInput, { color: theme.textColor, borderColor: theme.borderColor }]}
            placeholder={t('record.optional_note')}
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
          {t('record.laps', { count: record.laps.length })}
        </Text>
        {record.laps.length > 0 ? (
          groupSessions(record.laps).map((group) => (
            <View key={`session-${group.sessionIndex}`} style={styles.sessionSection}>
              <View style={styles.sessionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.textColor }]}>{t('record.session', { index: group.sessionIndex })}</Text>
                <Text style={[styles.sessionCount, { color: theme.textSecondary }]}>{t('record.laps', { count: group.items.length })}</Text>
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
            <Text style={[styles.emptyLapsText, { color: theme.textSecondary }]}>{t('record.no_laps')}</Text>
          </View>
        )}
      </View>
      </ScrollView>
      <Toast
        visible={showToast}
        message={toastMessage}
        onHide={() => setShowToast(false)}
      />
    </KeyboardAvoidingView>
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