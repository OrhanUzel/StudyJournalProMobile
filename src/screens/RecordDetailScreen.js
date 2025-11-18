import React, { useState, useEffect, useRef } from 'react';
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
  Platform,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AdsBanner from '../components/AdsBanner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import Toast from '../components/Toast';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import DatabaseService from '../services/DatabaseService';
import { LapRecord } from '../models/RecordModels';

const RecordDetailScreen = ({ route, navigation }) => {
  const { recordId } = route.params;
  const { theme, isDarkMode } = useTheme();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const bannerUnitId = 'ca-app-pub-3940256099942544/9214589741';
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dailyNote, setDailyNote] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [manualDuration, setManualDuration] = useState('');
  const [manualEndTime, setManualEndTime] = useState('');
  const [manualStartTime, setManualStartTime] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [manualNote, setManualNote] = useState('');
  const [editingLapId, setEditingLapId] = useState(null);
  const [editingLapNote, setEditingLapNote] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState('info');
  const scrollViewRef = useRef(null);
  const [editingLapInputY, setEditingLapInputY] = useState(0);
  const [manualNoteY, setManualNoteY] = useState(0);
  const [isLapModalVisible, setIsLapModalVisible] = useState(false);
  const [isManualModalVisible, setIsManualModalVisible] = useState(false);
  const [startAdjustMode, setStartAdjustMode] = useState('m'); // 'h' | 'm'
  const [endAdjustMode, setEndAdjustMode] = useState('m'); // 'h' | 'm'

  // Helpers for Android custom time controls
  const parseHM = (hm) => {
    const [h, m] = String(hm || '00:00').split(':').map((n) => parseInt(n, 10) || 0);
    return { h, m };
  };
  const fmtHM = (h, m) => {
    const hh = ((h % 24) + 24) % 24;
    const mm = ((m % 60) + 60) % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  };
  const adjustStart = (unit, delta) => {
    const { h, m } = parseHM(manualStartTime || '00:00');
    const nh = unit === 'h' ? h + delta : h;
    const nm = unit === 'm' ? m + delta : m;
    const hm = fmtHM(nh, nm);
    setManualStartTime(hm);
    const comp = computeDurationHHMMSS(hm, manualEndTime);
    if (comp) setManualDuration(comp);
  };
  const adjustEnd = (unit, delta) => {
    const { h, m } = parseHM(manualEndTime || '00:00');
    const nh = unit === 'h' ? h + delta : h;
    const nm = unit === 'm' ? m + delta : m;
    const hm = fmtHM(nh, nm);
    setManualEndTime(hm);
    const comp = computeDurationHHMMSS(manualStartTime, hm);
    if (comp) setManualDuration(comp);
  };

  // Short label helper to avoid showing missing i18n keys like 'record.hour_short'
  const tAbbr = (key, fallback) => {
    const val = t(key);
    if (!val || val === key) return fallback;
    return val;
  };

  const scrollToY = (y) => {
    try {
      if (scrollViewRef.current && typeof y === 'number') {
        scrollViewRef.current.scrollTo({ y: Math.max(y - 24, 0), animated: true });
      }
    } catch {}
  };

  useEffect(() => {
    // ensure editing state resets when record reloads
    setIsLapModalVisible(false);
  }, [recordId]);

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
      if (lap.isManual) continue; // manuel seansları grup dışı bırak
      const si = lap.sessionIndex || 1;
      if (!current || current.sessionIndex !== si) {
        current = { sessionIndex: si, items: [] };
        groups.push(current);
      }
      current.items.push(lap);
    }
    return groups;
  };

  // Manuel seansları listelemek için yardımcı
  const getManualLaps = (laps) => {
    if (!laps || laps.length === 0) return [];
    return laps.filter(l => l.isManual);
  };

  const handleAddManualSession = async () => {
    const startValid = /^\d{2}:\d{2}$/.test(String(manualStartTime));
    const endValid = /^\d{2}:\d{2}$/.test(String(manualEndTime));
    const computed = computeDurationHHMMSS(manualStartTime, manualEndTime);
    const finalDuration = computed || manualDuration;

    // Detailed validations with themed toast messages
    if (!/^\d{2}:\d{2}:\d{2}$/.test(String(finalDuration))) {
      setToastMessage(t('record.error.invalid_duration'));
      setToastVariant('error');
      setShowToast(true);
      return;
    }
    if (!endValid) {
      setToastMessage(t('record.error.invalid_end_time'));
      setToastVariant('error');
      setShowToast(true);
      return;
    }
    if (startValid && endValid && !computed) {
      // On mobile, if both times provided but computed failed, end is before start
      setToastMessage(t('record.error.end_before_start'));
      setToastVariant('error');
      setShowToast(true);
      return;
    }
    try {
      const nextSessionIndex = 0; // Manuel seanslar gruplara dahil edilmez
      const [y, m, d] = String(record.day).split('-').map(Number);
      const [hh, mm] = String(manualEndTime).split(':').map(Number);
      const endLocal = new Date(y || 0, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0);
      const lapRecord = new LapRecord(
        null,
        endLocal.toISOString(),
        finalDuration,
        finalDuration,
        manualNote || '',
        nextSessionIndex,
        true
      );
      await DatabaseService.addLapRecord(lapRecord, record.id, nextSessionIndex);
      await DatabaseService.recomputeTotalTimeForDay(record.id);
      await loadRecordDetails();
      setManualDuration('');
      setManualEndTime('');
      setManualStartTime('');
      setManualNote('');
      setToastMessage(t('stopwatch.saved'));
      setToastVariant('success');
      setShowToast(true);
    } catch (error) {
      setToastMessage(t('stopwatch.save_error', { message: error.message }));
      setToastVariant('error');
      setShowToast(true);
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

  const pad2 = (n) => String(n).padStart(2, '0');
  const formatHM = (date) => `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  const hmToDateOnRecordDay = (hm) => {
    const [y, m, d] = String(record?.day || '').split('-').map(Number);
    const base = new Date(y || 1970, (m || 1) - 1, d || 1);
    if (!hm || !/^\d{2}:\d{2}$/.test(hm)) return base;
    const [hh, mm] = hm.split(':').map(Number);
    const dt = new Date(base);
    dt.setHours(hh || 0, mm || 0, 0, 0);
    return dt;
  };
  const computeDurationHHMMSS = (startHM, endHM) => {
    if (!/^\d{2}:\d{2}$/.test(String(startHM)) || !/^\d{2}:\d{2}$/.test(String(endHM))) return null;
    const start = hmToDateOnRecordDay(startHM);
    const end = hmToDateOnRecordDay(endHM);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) return null;
    const totalSec = Math.floor(diffMs / 1000);
    const h = Math.floor(totalSec / 3600);
    const m2 = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${pad2(h)}:${pad2(m2)}:${pad2(s)}`;
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
        theme.shadow?.xs,
        { backgroundColor: theme.cardBackground, borderColor: theme.borderColor }
      ]}>
        <View style={styles.lapHeader}>
          <Text style={[styles.lapNumber, { color: theme.textColor }]}>
            {t('record.lap', { index: index + 1 })}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.lapTime, { color: theme.accentColor }]}>
              {item.duration}
            </Text>
            <TouchableOpacity 
              style={[styles.editButton, { borderColor: theme.borderColor }]} 
              onPress={() => { setEditingLapId(item.id); setEditingLapNote(item.note || ''); setIsLapModalVisible(true); }}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t('record.edit_lap_note')}
            >
              <Ionicons name="create-outline" size={20} color={theme.primaryColor} />
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
            // Inline edit is replaced by modal, keep read-only here
            item.note ? (
              <Text style={[styles.lapNote, { color: theme.textColor }]}> 
                {String(item.note).replace(/\\n/g, '\n')}
              </Text>
            ) : null
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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 80} style={{ flex: 1 }}>
      <ScrollView ref={scrollViewRef} style={[styles.container, { backgroundColor: theme.background }]} keyboardShouldPersistTaps="always" contentContainerStyle={{ paddingBottom: 96 }}>
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
          <TouchableOpacity 
            onPress={() => setIsEditing(!isEditing)}
            style={[styles.editButton, { borderColor: theme.borderColor }]}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={isEditing ? t('common.cancel') : t('record.edit_lap_note')}
          >
            <Ionicons 
              name={isEditing ? "close-outline" : "create-outline"} 
              size={20} 
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

      {/* Manuel Seans Ekle (Buton + Modal açılır) */}
      {/* Banner Ad - manuel seans ekleme bölümünün üzeri */}
      <AdsBanner
        unitId={bannerUnitId}
        containerStyle={{
          paddingHorizontal: 8,
          paddingTop: 8,
          paddingBottom: 8,
          marginTop: 8,
          marginBottom: 8,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: theme.borderColor,
          backgroundColor: theme.background,
        }}
      />
      <View style={[styles.manualSection, theme.shadow?.sm, { backgroundColor: theme.cardBackground, borderColor: theme.borderColor, borderWidth: 1 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontSize: 16, fontWeight: '600' }]}>{t('record.manual_add')}</Text>
          <TouchableOpacity
            style={[styles.editButton, { borderColor: theme.borderColor }]}
            onPress={() => setIsManualModalVisible(true)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('record.manual_add')}
          >
            <Ionicons name="create-outline" size={20} color={theme.primaryColor} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Seanslar Bölümü (Normal seanslar) */}
      <View style={styles.lapsSection}>
        <Text style={[styles.sectionTitle, { color: theme.textColor }]}> 
          {t('record.sessions', { count: groupSessions((record.laps || []).filter(l => !l.isManual)).length })}
        </Text>
        {(record.laps || []).filter(l => !l.isManual).length > 0 ? (
          (() => {
            const groups = groupSessions(record.laps);
            return groups.map((group, idx) => (
              <React.Fragment key={`session-wrap-${group.sessionIndex}`}>
                <View key={`session-${group.sessionIndex}`} style={[styles.sessionSection, theme.shadow?.sm, { backgroundColor: theme.cardBackground, borderColor: theme.borderColor, borderWidth: 1 }] }>
                  <View style={styles.sessionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.textColor }]}>{t('record.session', { index: group.sessionIndex })}</Text>
                    <Text style={[styles.sessionCount, { color: theme.textSecondary }]}>{t('record.laps', { count: group.items.length })}</Text>
                  </View>
                  <FlatList
                    data={group.items}
                    renderItem={renderLapItem}
                    keyExtractor={(item, idx2) => (item.id != null ? `lap-${item.id}` : `lap-${item.sessionIndex}-${item.lapDate}-${idx2}`)}
                    scrollEnabled={false}
                  />
                </View>
                {idx < groups.length - 1 && (
                  <AdsBanner
                    unitId={bannerUnitId}
                    containerStyle={{
                      paddingHorizontal: 8,
                      paddingTop: 8,
                      paddingBottom: 8,
                      marginTop: 8,
                      marginBottom: 8,
                      borderTopWidth: 1,
                      borderBottomWidth: 1,
                      borderColor: theme.borderColor,
                      backgroundColor: theme.background,
                    }}
                  />
                )}
              </React.Fragment>
            ));
          })()
        ) : (
          <View style={styles.emptyLapsContainer}>
            <Text style={[styles.emptyLapsText, { color: theme.textSecondary }]}>{t('record.no_laps')}</Text>
          </View>
        )}
      </View>

      {/* Manuel Seanslar Bölümü (normal seanslardan sonra) */}
      <View style={styles.lapsSection}>
        <Text style={[styles.sectionTitle, { color: theme.textColor }]}> 
          {t('record.manual_sessions', { count: getManualLaps(record.laps).length })}
        </Text>
        {getManualLaps(record.laps).length > 0 ? (
          <FlatList
            data={getManualLaps(record.laps)}
            renderItem={renderLapItem}
            keyExtractor={(item, idx) => (item.id != null ? `manuallap-${item.id}` : `manuallap-${item.sessionIndex}-${item.lapDate}-${idx}`)}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptyLapsContainer}>
            <Text style={[styles.emptyLapsText, { color: theme.textSecondary }]}>{t('record.no_laps')}</Text>
          </View>
        )}
      </View>

      {/* Banner Ad - sayfa sonunda, içerik bittiğinde */}
      <AdsBanner
        unitId={bannerUnitId}
        containerStyle={{
          paddingHorizontal: 8,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
          marginTop: 8,
          borderTopWidth: 1,
          borderTopColor: theme.borderColor,
          backgroundColor: theme.background,
        }}
      />

      </ScrollView>
      {/* Dim backdrop over the screen when any modal is visible */}
      {(isLapModalVisible || isManualModalVisible) && (
        <View style={[styles.dimOverlay, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.35)' }]} />
      )}
      <Modal
        visible={isLapModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { setIsLapModalVisible(false); setEditingLapId(null); setEditingLapNote(''); }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 80} style={styles.modalOverlay}>
          <View style={[styles.modalContent, theme.shadow?.lg, { backgroundColor: theme.cardBackground, borderColor: theme.borderColor }]}> 
            {/* Header with title and close button */}
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: theme.textColor }]}>{t('record.edit_lap_note')}</Text>
              <TouchableOpacity
                onPress={() => { setIsLapModalVisible(false); setEditingLapId(null); setEditingLapNote(''); }}
                style={[styles.editButton, { borderColor: theme.borderColor }]}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
              >
                <Ionicons name="close-outline" size={20} color={theme.primaryColor} />
              </TouchableOpacity>
            </View>
            {/* Session & Lap info */}
            {(() => {
              const lap = record?.laps?.find(l => l.id === editingLapId);
              if (!lap) return null;
              const isManual = !!lap.isManual;
              let displaySessionLabel;
              let displayLapIndex;
              if (isManual) {
                const manualList = getManualLaps(record?.laps || []);
                const idx = manualList.findIndex(x => x.id === lap.id);
                displayLapIndex = idx >= 0 ? (idx + 1) : '?';
                displaySessionLabel = t('record.manual_session');
              } else {
                const groups = groupSessions(record?.laps || []);
                const group = groups.find(g => g.sessionIndex === (lap.sessionIndex || 1));
                displayLapIndex = group ? (group.items.findIndex(x => x.id === lap.id) + 1) : '?';
                displaySessionLabel = t('record.session', { index: lap.sessionIndex || 1 });
              }
              return (
                <View style={styles.chipsRow}>
                  <View style={[styles.badge, { borderColor: theme.borderColor, backgroundColor: theme.background }]}>
                    <Ionicons name="albums-outline" size={14} color={theme.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={[styles.badgeText, { color: theme.textSecondary }]}>
                      {displaySessionLabel}
                    </Text>
                  </View>
                  <View style={[styles.badge, { borderColor: theme.borderColor, backgroundColor: theme.background }]}>
                    <Ionicons name="flag-outline" size={14} color={theme.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={[styles.badgeText, { color: theme.textSecondary }]}>
                      {t('record.lap', { index: displayLapIndex })}
                    </Text>
                  </View>
                </View>
              );
            })()}
            {/* Lap info summary */}
            {(() => {
              const lap = record?.laps?.find(l => l.id === editingLapId);
              if (!lap) return null;
              const endDate = new Date(lap.lapDate);
              const startDate = new Date(endDate.getTime() - hmsToMs(lap.duration));
              const locale = language === 'en' ? 'en-US' : 'tr-TR';
              return (
                <View style={styles.statsRow}>
                  <View style={[styles.statBox, { borderColor: theme.borderColor, backgroundColor: theme.background }]}> 
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('record.duration')}</Text>
                    <Text style={[styles.statValue, { color: theme.textColor }]}>{lap.duration}</Text>
                  </View>
                  <View style={[styles.statBox, { borderColor: theme.borderColor, backgroundColor: theme.background }]}> 
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('record.start')}</Text>
                    <Text style={[styles.statValue, { color: theme.textColor }]}>
                      {startDate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <View style={[styles.statBox, { borderColor: theme.borderColor, backgroundColor: theme.background }]}> 
                    <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('record.end')}</Text>
                    <Text style={[styles.statValue, { color: theme.textColor }]}>{formatTime(lap.lapDate)}</Text>
                  </View>
                </View>
              );
            })()}
            <TextInput
              style={[styles.manualNoteInput, { color: theme.textColor, borderColor: theme.borderColor, marginTop: 12 }]}
              value={editingLapNote}
              onChangeText={setEditingLapNote}
              placeholder={t('stopwatch.lap_note_ph')}
              placeholderTextColor={theme.textSecondary}
              multiline
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.manualAddButton, { backgroundColor: theme.primaryColor, flex: 1 }]}
                onPress={async () => {
                  try {
                    await DatabaseService.updateLapRecordNote(editingLapId, editingLapNote.trim());
                    await loadRecordDetails();
                    setEditingLapId(null);
                    setEditingLapNote('');
                    setIsLapModalVisible(false);
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
                style={[styles.manualAddButton, { backgroundColor: theme.borderColor, flex: 1 }]}
                onPress={() => { setIsLapModalVisible(false); setEditingLapId(null); setEditingLapNote(''); }}
              >
                <Text style={[styles.manualAddButtonText, { color: theme.textColor }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Manual Session Add Modal */}
      <Modal
        visible={isManualModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { 
          setIsManualModalVisible(false);
          setManualDuration('');
          setManualEndTime('');
          setManualStartTime('');
          setManualNote('');
        }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 80} style={styles.modalOverlay}>
          <View style={[styles.modalContent, theme.shadow?.lg, { backgroundColor: theme.cardBackground, borderColor: theme.borderColor }]}> 
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: theme.textColor }]}>{t('record.manual_add')}</Text>
              <TouchableOpacity
                onPress={() => { 
                  setIsManualModalVisible(false);
                  setManualDuration('');
                  setManualEndTime('');
                  setManualStartTime('');
                  setManualNote('');
                }}
                style={[styles.editButton, { borderColor: theme.borderColor }]}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
              >
                <Ionicons name="close-outline" size={20} color={theme.primaryColor} />
              </TouchableOpacity>
            </View>

            {/* Inputs for manual session */}
            {Platform.OS === 'web' ? (
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
              </View>
            ) : Platform.OS === 'ios' ? (
              <View style={styles.manualRow}>
                <TouchableOpacity
                  style={[styles.manualInput, { justifyContent: 'center', borderColor: theme.borderColor }]}
                  onPress={() => setShowStartPicker(true)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  accessibilityRole="button"
                  accessibilityLabel={t('record.start')}
                >
                  <Text style={{ color: theme.textColor }}>
                    {manualStartTime ? `${t('record.start')}: ${manualStartTime}` : `${t('record.start')}`}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.manualInput, { justifyContent: 'center', borderColor: theme.borderColor }]}
                  onPress={() => setShowEndPicker(true)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  accessibilityRole="button"
                  accessibilityLabel={t('record.end')}
                >
                  <Text style={{ color: theme.textColor }}>
                    {manualEndTime ? `${t('record.end')}: ${manualEndTime}` : `${t('record.end')}`}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.manualRow, { marginBottom: 6 }] }>
                <View style={[styles.manualInput, { borderColor: theme.borderColor, paddingVertical: 8, marginRight: 10 }] }>
                  <Text style={{ color: theme.textSecondary, marginBottom: 8 }}>{t('record.start')}</Text>
                  <View style={styles.timeControlRow}>
                    <TouchableOpacity style={[styles.stepButton, { borderColor: theme.borderColor, backgroundColor: theme.background }]} onPress={() => adjustStart(startAdjustMode, (startAdjustMode === 'm' ? -5 : -1))}>
                      <Ionicons name="chevron-down-outline" size={18} color={theme.textSecondary} />
                    </TouchableOpacity>
                    <Text style={[styles.timeValue, { color: theme.textColor }]}>{manualStartTime || '--:--'}</Text>
                    <TouchableOpacity style={[styles.stepButton, { borderColor: theme.borderColor, backgroundColor: theme.background }]} onPress={() => adjustStart(startAdjustMode, (startAdjustMode === 'm' ? +5 : +1))}>
                      <Ionicons name="chevron-up-outline" size={18} color={theme.textSecondary} />
                    </TouchableOpacity>
                    <View style={styles.segmentRow}>
                      <TouchableOpacity style={[styles.segmentOption, { borderColor: theme.borderColor, backgroundColor: startAdjustMode === 'h' ? theme.primaryMuted || theme.borderColor : theme.background }]} onPress={() => setStartAdjustMode('h')}>
                        <Text style={[styles.segmentText, { color: theme.textSecondary }]}>{tAbbr('stopwatch.hours_abbr', 'H')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.segmentOption, { borderColor: theme.borderColor, backgroundColor: startAdjustMode === 'm' ? theme.primaryMuted || theme.borderColor : theme.background }]} onPress={() => setStartAdjustMode('m')}>
                        <Text style={[styles.segmentText, { color: theme.textSecondary }]}>{tAbbr('stopwatch.minutes_abbr', 'M')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
                <View style={[styles.manualInput, { borderColor: theme.borderColor, paddingVertical: 8, marginRight: 0 }] }>
                  <Text style={{ color: theme.textSecondary, marginBottom: 8 }}>{t('record.end')}</Text>
                  <View style={styles.timeControlRow}>
                    <TouchableOpacity style={[styles.stepButton, { borderColor: theme.borderColor, backgroundColor: theme.background }]} onPress={() => adjustEnd(endAdjustMode, (endAdjustMode === 'm' ? -5 : -1))}>
                      <Ionicons name="chevron-down-outline" size={18} color={theme.textSecondary} />
                    </TouchableOpacity>
                    <Text style={[styles.timeValue, { color: theme.textColor }]}>{manualEndTime || '--:--'}</Text>
                    <TouchableOpacity style={[styles.stepButton, { borderColor: theme.borderColor, backgroundColor: theme.background }]} onPress={() => adjustEnd(endAdjustMode, (endAdjustMode === 'm' ? +5 : +1))}>
                      <Ionicons name="chevron-up-outline" size={18} color={theme.textSecondary} />
                    </TouchableOpacity>
                    <View style={styles.segmentRow}>
                      <TouchableOpacity style={[styles.segmentOption, { borderColor: theme.borderColor, backgroundColor: endAdjustMode === 'h' ? theme.primaryMuted || theme.borderColor : theme.background }]} onPress={() => setEndAdjustMode('h')}>
                        <Text style={[styles.segmentText, { color: theme.textSecondary }]}>{tAbbr('stopwatch.hours_abbr', 'H')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.segmentOption, { borderColor: theme.borderColor, backgroundColor: endAdjustMode === 'm' ? theme.primaryMuted || theme.borderColor : theme.background }]} onPress={() => setEndAdjustMode('m')}>
                        <Text style={[styles.segmentText, { color: theme.textSecondary }]}>{tAbbr('stopwatch.minutes_abbr', 'M')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {Platform.OS === 'ios' && (
              <View style={{ marginTop: 8 }}>
                {showStartPicker && (
                  <DateTimePicker
                    mode="time"
                    value={hmToDateOnRecordDay(manualStartTime) || new Date()}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    themeVariant={isDarkMode ? 'dark' : 'light'}
                    textColor={Platform.OS === 'ios' ? theme.textColor : undefined}
                    onChange={(event, selectedDate) => {
                      if (Platform.OS !== 'ios') setShowStartPicker(false);
                      if (event.type === 'set' && selectedDate) {
                        const hm = formatHM(selectedDate);
                        setManualStartTime(hm);
                        const comp = computeDurationHHMMSS(hm, manualEndTime);
                        if (comp) setManualDuration(comp);
                      }
                    }}
                  />
                )}
                {showEndPicker && (
                  <DateTimePicker
                    mode="time"
                    value={hmToDateOnRecordDay(manualEndTime) || new Date()}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    themeVariant={isDarkMode ? 'dark' : 'light'}
                    textColor={Platform.OS === 'ios' ? theme.textColor : undefined}
                    onChange={(event, selectedDate) => {
                      if (Platform.OS !== 'ios') setShowEndPicker(false);
                      if (event.type === 'set' && selectedDate) {
                        const hm = formatHM(selectedDate);
                        setManualEndTime(hm);
                        const comp = computeDurationHHMMSS(manualStartTime, hm);
                        if (comp) setManualDuration(comp);
                      }
                    }}
                  />
                )}
              </View>
            )}

            <TextInput
              style={[styles.manualNoteInput, { color: theme.textColor, borderColor: theme.borderColor, marginTop: 6 }]}
              placeholder={t('record.optional_note')}
              placeholderTextColor={theme.textSecondary}
              value={manualNote}
              onChangeText={setManualNote}
              multiline
            />

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.manualAddButton, { backgroundColor: theme.primaryColor, flex: 1 }]}
                onPress={async () => {
                  await handleAddManualSession();
                  setIsManualModalVisible(false);
                }}
              >
                <Text style={styles.manualAddButtonText}>{t('record.save')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.manualAddButton, { backgroundColor: theme.borderColor, flex: 1 }]}
                onPress={() => { 
                  setIsManualModalVisible(false);
                  setManualDuration('');
                  setManualEndTime('');
                  setManualStartTime('');
                  setManualNote('');
                }}
              >
                <Text style={[styles.manualAddButtonText, { color: theme.textColor }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Toast
        visible={showToast}
        message={toastMessage}
        variant={toastVariant}
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
    padding: 12,
    borderRadius: 12,
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
    borderWidth: 1,
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
  editButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
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
    borderWidth: 1,
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
  },
  timeControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
  },
  stepButton: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderRadius: 6,
    marginRight: 6,
  },
  segmentRow: {
    flexDirection: 'row',
    marginLeft: 0,
    marginTop: 6,
  },
  segmentOption: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 6,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeValue: {
    minWidth: 52,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  // Backdrop overlays for modal
  blurBackdrop: {
    ...StyleSheet.absoluteFillObject,
    position: 'absolute',
    zIndex: 50,
  },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    position: 'absolute',
    zIndex: 49,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 520,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 6,
    borderColor: 'transparent',
  },
  // Chips row (Session & Lap)
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  badgeText: {
    fontSize: 13,
  },
  // Stats row (Duration, Start, End)
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
  },
  statBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  statLabel: {
    fontSize: 12,
  },
  statValue: {
    fontSize: 14,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  }
});

export default RecordDetailScreen;