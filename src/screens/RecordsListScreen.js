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
  Modal,
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { isTurkeyRegion } from '../services/RegionService';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import DatabaseService from '../services/DatabaseService';
import ConfirmDialog from '../components/ConfirmDialog';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import AdsBanner from '../components/AdsBanner';
import { getBannerUnitId } from '../config/adMobIds';
import { getPremiumStatus } from '../services/InAppPurchaseService';

const RecordsListScreen = ({ navigation }) => {
  const { theme, spacing } = useTheme();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const bannerUnitId = getBannerUnitId();

  // Calendar state
  const [isCalendarVisible, setCalendarVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [markedDates, setMarkedDates] = useState({});
  const [showPremiumDialog, setShowPremiumDialog] = useState(false);

  const handleCalendarPress = async () => {
    try {
      if (isTurkeyRegion()) {
        setCalendarVisible(true);
        return;
      }
      const status = await getPremiumStatus();
      if (!status?.active) {
        setShowPremiumDialog(true);
        return;
      }
      setCalendarVisible(true);
    } catch {
      setCalendarVisible(true);
    }
  };

  // Configure calendar locale dynamically
  useEffect(() => {
    const localeTag = language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : language === 'ar' ? 'ar' : 'tr-TR';
    const monthNames = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(2000, i, 1);
      return d.toLocaleDateString(localeTag, { month: 'long' });
    });
    const monthNamesShort = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(2000, i, 1);
      return d.toLocaleDateString(localeTag, { month: 'short' });
    });
    const dayNames = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(2000, 0, 2 + i);
      return d.toLocaleDateString(localeTag, { weekday: 'long' });
    });
    const dayNamesShort = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(2000, 0, 2 + i);
      return d.toLocaleDateString(localeTag, { weekday: 'short' });
    });

    LocaleConfig.locales[language] = {
      monthNames,
      monthNamesShort,
      dayNames,
      dayNamesShort,
      today: (language === 'tr' ? 'Bugün' : language === 'es' ? 'Hoy' : language === 'ar' ? 'اليوم' : 'Today'),
    };
    LocaleConfig.defaultLocale = language;
  }, [language]);

  // Update marked dates when records change or date is selected
  useEffect(() => {
    const marks = {};
    
    // Mark days with records
    records.forEach(record => {
      marks[record.day] = {
        marked: true,
        dotColor: theme.primaryColor,
        activeOpacity: 0.7
      };
    });

    // Mark selected date
    if (selectedDate) {
      marks[selectedDate] = {
        ...(marks[selectedDate] || {}),
        selected: true,
        selectedColor: theme.primaryColor,
        selectedTextColor: '#fff'
      };
    }

    setMarkedDates(marks);
  }, [records, selectedDate, theme]);

  // Filter records based on selection
  const displayedRecords = selectedDate 
    ? records.filter(r => r.day === selectedDate)
    : records;

  const getLocaleTag = () => (language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : language === 'ar' ? 'ar' : 'tr-TR');

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
    const locale = getLocaleTag();
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
      <View style={[styles.header, { borderBottomColor: theme.border, borderBottomWidth: 1, paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.text }]}>
            {t('nav.records')}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {!selectedDate && (
              <TouchableOpacity 
                style={[styles.iconButton, { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}
                onPress={handleCalendarPress}
                accessibilityRole="button"
                accessibilityLabel={t('records.select_date')}
              >
                <Ionicons name={selectedDate ? "calendar" : "calendar-outline"} size={20} color={selectedDate ? theme.primaryColor : theme.text} />
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[styles.newButton, { backgroundColor: theme.primaryColor }]}
              onPress={() => navigation.navigate('Stopwatch')}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {t('records.subtitle')}
        </Text>
        {selectedDate && (
          <View style={[styles.filterRow]}> 
            <TouchableOpacity 
              style={[styles.filterBadge, { backgroundColor: theme.primaryColor + '20', borderColor: theme.primaryColor }]}
              onPress={() => setSelectedDate(null)}
              accessibilityRole="button"
              accessibilityLabel={t('common.clear_filter')}
            >
              <Text style={{ color: theme.primaryColor, fontSize: 12, fontWeight: '600' }}>
                {formatDate(selectedDate)}
              </Text>
              <Ionicons name="close-circle" size={16} color={theme.primaryColor} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.iconButton, { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}
              onPress={handleCalendarPress}
              accessibilityRole="button"
              accessibilityLabel={t('records.select_date')}
            >
              <Ionicons name={selectedDate ? "calendar" : "calendar-outline"} size={20} color={selectedDate ? theme.primaryColor : theme.text} />
            </TouchableOpacity>
          </View>
        )}
      </View>
 <AdsBanner
        unitId={bannerUnitId}
        containerStyle={[
          styles.bannerContainer,
          {
            borderTopColor: theme.border,
            borderTopWidth: 1,
            paddingHorizontal: spacing?.sm ?? 8,
            marginTop: spacing?.sm ?? 8,
            marginBottom: spacing?.sm ?? 8,
          },
        ]}
      />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primaryColor} />
        </View>
      ) : displayedRecords.length > 0 ? (
        <FlatList
          data={displayedRecords}
          renderItem={renderRecordItem}
          keyExtractor={(item) => item.id.toString()}
          ItemSeparatorComponent={() => (
            <AdsBanner
              unitId={bannerUnitId}
              containerStyle={[
                styles.bannerContainer,
                {
                  borderTopColor: theme.border,
                  borderTopWidth: 1,
                  paddingHorizontal: spacing?.sm ?? 8,
                  marginTop: spacing?.sm ?? 8,
                  marginBottom: spacing?.sm ?? 8,
                },
              ]}
            />
          )}
          contentContainerStyle={[styles.recordsList, { paddingBottom: tabBarHeight + 16 }]}
        />
      ) : (
        <View style={styles.emptyContainer}>
          {selectedDate ? (
            <>
              <Ionicons name="search-outline" size={64} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary, textAlign: 'center', marginTop: 16 }]}>
                {t('records.no_records_date', { date: formatDate(selectedDate) }) || `No records for ${formatDate(selectedDate)}`}
              </Text>
              <TouchableOpacity
                style={[styles.startButton, { backgroundColor: theme.secondary || theme.textSecondary, marginTop: 16 }]}
                onPress={() => setSelectedDate(null)}
              >
                <Text style={styles.startButtonText}>{t('common.show_all')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
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
            </>
          )}
        </View>
      )}

      <Modal
        visible={isCalendarVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCalendarVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setCalendarVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.card }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text, textAlign: language === 'ar' ? 'right' : 'left' }]}>
                {t('records.select_date') || "Select Date"}
              </Text>
              <TouchableOpacity onPress={() => setCalendarVisible(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <Calendar
              current={selectedDate || undefined}
              firstDay={(language === 'ar') ? 6 : (language === 'en' && !isTurkeyRegion()) ? 7 : 1}
              onDayPress={day => {
                setSelectedDate(day.dateString);
                setCalendarVisible(false);
              }}
              markedDates={markedDates}
              theme={{
                backgroundColor: theme.card,
                calendarBackground: theme.card,
                textSectionTitleColor: theme.textSecondary,
                selectedDayBackgroundColor: theme.primaryColor,
                selectedDayTextColor: '#ffffff',
                todayTextColor: theme.primaryColor,
                dayTextColor: theme.text,
                textDisabledColor: theme.border,
                dotColor: theme.primaryColor,
                selectedDotColor: '#ffffff',
                arrowColor: theme.primaryColor,
                monthTextColor: theme.text,
                indicatorColor: theme.primaryColor,
              }}
              hideExtraDays={false}
              enableSwipeMonths={true}
            />
            
            <TouchableOpacity 
              style={[styles.clearButton, { borderColor: theme.dangerColor }]}
              onPress={() => {
                setSelectedDate(null);
                setCalendarVisible(false);
              }}
            >
              <Text style={{ color: theme.dangerColor }}>{t('common.clear_filter') || "Clear Filter"}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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

      <ConfirmDialog
        visible={showPremiumDialog}
        title={t('iap.premium_title')}
        message={t('iap.calendar_premium_message')}
        cancelText={t('common.cancel')}
        confirmText={t('iap.go_premium')}
        onCancel={() => setShowPremiumDialog(false)}
        onConfirm={() => {
          setShowPremiumDialog(false);
          navigation.navigate('Settings', { openPlans: true });
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
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
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
  filterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  clearButton: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
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
