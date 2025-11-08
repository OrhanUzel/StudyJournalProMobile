import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import DatabaseService from '../services/DatabaseService';
import ConfirmDialog from '../components/ConfirmDialog';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import AdsBanner from '../components/AdsBanner';

const RecordsListScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const bannerUnitId = 'ca-app-pub-3940256099942544/9214589741';

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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              style={[styles.iconButton, { borderColor: theme.borderColor }]}
              onPress={() => navigation.navigate('RecordDetail', { recordId: item.id })}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t('record.edit_lap_note')}
            >
              <Ionicons name="create-outline" size={20} color={theme.primaryColor} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconButton, { borderColor: theme.borderColor }]}
              onPress={() => handleDeleteRecord(item)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t('common.delete')}
            >
              <Ionicons name="trash-outline" size={20} color={theme.dangerColor} />
            </TouchableOpacity>
          </View>
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
      <View style={[styles.header, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.text }]}>
            {t('nav.records')}
          </Text>
          <TouchableOpacity 
            style={[styles.newButton, { backgroundColor: theme.primaryColor }]}
            onPress={() => navigation.navigate('Stopwatch')}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {t('records.subtitle')}
        </Text>
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
          contentContainerStyle={[styles.recordsList, { paddingBottom: insets.bottom + tabBarHeight + 16 }]}
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

      <AdsBanner
        unitId={bannerUnitId}
        containerStyle={[styles.bannerContainer, { borderTopColor: theme.border, borderTopWidth: 1 }]}
      />

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
  },
  header: {
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 8,
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
    padding: 16,
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
  iconButton: {
    padding: 6,
    borderWidth: 1,
    borderRadius: 8,
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
  bannerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
});

export default RecordsListScreen;