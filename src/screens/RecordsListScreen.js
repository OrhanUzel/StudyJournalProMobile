import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import DatabaseService from '../services/DatabaseService';
import ConfirmDialog from '../components/ConfirmDialog';
import { useIsFocused } from '@react-navigation/native';

const RecordsListScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);

  // Kayıtları yükle
  const loadRecords = async () => {
    setLoading(true);
    try {
      const dailyRecords = await DatabaseService.getAllDailyRecords();
      setRecords(dailyRecords);
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  // Ekran odaklandığında kayıtları yeniden yükle
  useEffect(() => {
    if (isFocused) {
      loadRecords();
    }
  }, [isFocused]);

  // Kaydı sil
  const handleDeleteRecord = (record) => {
    setRecordToDelete(record);
    setShowDeleteConfirm(true);
  };

  // Tarih formatla
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const locale = language === 'en' ? 'en-US' : 'tr-TR';
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Kayıt öğesi render fonksiyonu
  const renderRecordItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={[styles.recordItem, { backgroundColor: theme.cardBackground }]}
        onPress={() => navigation.navigate('RecordDetail', { recordId: item.id })}
      >
        <View style={styles.recordHeader}>
          <Text style={[styles.recordDate, { color: theme.textColor }]}>
            {formatDate(item.day)}
          </Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteRecord(item)}
          >
            <Ionicons name="trash-outline" size={20} color={theme.dangerColor} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.recordDetails}>
          <View style={styles.timeContainer}>
            <Ionicons name="time-outline" size={18} color={theme.accentColor} />
            <Text style={[styles.totalTime, { color: theme.textColor }]}>
              {item.totalTimeForDay}
            </Text>
          </View>
          
          {item.dailyNote ? (
            <Text 
              style={[styles.recordNote, { color: theme.textSecondary }]}
              numberOfLines={2}
            >
              {item.dailyNote}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.textColor }]}>
          {t('records.title')}
        </Text>
        <TouchableOpacity 
          style={[styles.newButton, { backgroundColor: theme.primaryColor }]}
          onPress={() => navigation.navigate('Stopwatch')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primaryColor} />
        </View>
      ) : records.length > 0 ? (
        <FlatList
          data={records}
          renderItem={renderRecordItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.recordsList}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {t('records.empty')}
          </Text>
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: theme.primaryColor }]}
            onPress={() => navigation.navigate('Stopwatch')}
          >
            <Text style={styles.startButtonText}>{t('records.start_study')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <ConfirmDialog
        visible={showDeleteConfirm}
        title={t('records.delete_title')}
        message={recordToDelete ? t('records.delete_body', { date: formatDate(recordToDelete.day) }) : t('records.delete_body', { date: '' })}
        cancelText={t('common.cancel')}
        confirmText={t('common.delete')}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          setShowDeleteConfirm(false);
          if (recordToDelete) {
            try {
              await DatabaseService.deleteDailyRecord(recordToDelete.id);
              setRecordToDelete(null);
              loadRecords();
            } catch (error) {
              Alert.alert(t('common.error'), error.message);
            }
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  newButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordsList: {
    paddingBottom: 20,
  },
  recordItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordDate: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    padding: 4,
  },
  recordDetails: {
    marginTop: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  totalTime: {
    marginLeft: 6,
    fontSize: 15,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  recordNote: {
    marginTop: 6,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
    marginBottom: 24,
    textAlign: 'center',
  },
  startButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  startButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default RecordsListScreen;