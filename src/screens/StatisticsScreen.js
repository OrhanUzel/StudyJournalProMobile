import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Pressable } from 'react-native';
import { useNotes } from '../context/NotesContext';
import { useTheme } from '../context/ThemeContext';
import ChartCard from '../components/ChartCard';
import { Ionicons } from '@expo/vector-icons';
import DatabaseService from '../services/DatabaseService';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { isTurkeyRegion } from '../services/RegionService';
import { useLanguage } from '../context/LanguageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import AdsBanner from '../components/AdsBanner';
import { getBannerUnitId } from '../config/adMobIds';
import { isAdsDisabled, onPremiumStatusChange, getPremiumStatus } from '../services/InAppPurchaseService';

/**
 * StatisticsScreen component displays study time statistics
 */
const StatisticsScreen = () => {
  const { getStudyStats } = useNotes();
  const { theme, spacing, borderRadius } = useTheme();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const bannerUnitId = getBannerUnitId();
  const navigation = useNavigation();
  const [adsDisabled, setAdsDisabled] = useState(false);

  const showInterstitialIfEligible = () => {};
  const [activePeriod, setActivePeriod] = useState('week');
  const [stats, setStats] = useState([]);
  const isFocused = useIsFocused();
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);
  const periodOptions = React.useMemo(() => ([
    { key: 'week', label: t('period.week') },
    { key: 'last_1w', label: t('period.last_1w') },
    { key: 'month', label: t('period.month') },
    { key: 'last_1m', label: t('period.last_1m') },
    { key: 'last_3m', label: t('period.last_3m') },
    { key: 'last_6m', label: t('period.last_6m') },
    { key: 'year', label: t('period.year') },
    { key: 'last_1y', label: t('period.last_1y') },
  ]), [language]);
 
  useEffect(() => {
    let off;
    (async () => {
      try {
        const status = await getPremiumStatus();
        setAdsDisabled(!!status?.active);
      } catch {
        const disabled = await isAdsDisabled();
        setAdsDisabled(!!disabled);
      }
    })();
    off = onPremiumStatusChange((status) => setAdsDisabled(!!status?.active));
    return () => { off && off(); };
  }, []);

  useEffect(() => {
    const now = new Date();
    let startDate;

    if (activePeriod === 'week') {
      const day = now.getDay();
      const mondayOffset = (day + 6) % 7;
      const s = new Date(now);
      s.setDate(now.getDate() - mondayOffset);
      s.setHours(0, 0, 0, 0);
      startDate = s;
    } else if (activePeriod === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (activePeriod === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else if (activePeriod === 'last_1m') {
      const s = new Date(now);
      s.setDate(now.getDate() - 30);
      s.setHours(0, 0, 0, 0);
      startDate = s;
    } else if (activePeriod === 'last_3m') {
      const s = new Date(now);
      s.setMonth(now.getMonth() - 3);
      s.setHours(0, 0, 0, 0);
      startDate = s;
    } else if (activePeriod === 'last_6m') {
      const s = new Date(now);
      s.setMonth(now.getMonth() - 6);
      s.setHours(0, 0, 0, 0);
      startDate = s;
    } else if (activePeriod === 'last_1y') {
      const s = new Date(now);
      s.setFullYear(now.getFullYear() - 1);
      s.setHours(0, 0, 0, 0);
      startDate = s;
    } else {
      const s = new Date(now);
      s.setDate(now.getDate() - 7);
      s.setHours(0, 0, 0, 0);
      startDate = s;
    }

    const noteStats = (getStudyStats(activePeriod) || []).map((s) => ({
      date: s.date,
      duration: typeof s.duration === 'number' ? s.duration : Number(s.duration) || 0,
      subject: s.subject,
    }));

    const hmsToMinutes = (hms) => {
      if (!hms || typeof hms !== 'string') return 0;
      const [h = 0, m = 0, s = 0] = hms.split(':').map(Number);
      return Math.floor((h * 3600 + m * 60 + s) / 60);
    };

    (async () => {
      try {
        const records = await DatabaseService.getAllDailyRecords();
        const dailyStats = records
          .filter((r) => new Date(`${r.day}T00:00:00`) >= startDate)
          .map((r) => ({
            date: r.day,
            duration: hmsToMinutes(r.totalTimeForDay),
          }));
        setStats([...noteStats, ...dailyStats]);
      } catch (err) {
        console.error('İstatistik verisi yüklenemedi:', err);
        setStats(noteStats);
      }
    })();
  }, [activePeriod, isFocused]);

  const totalStudyTime = stats.reduce((total, session) => total + (session.duration || 0), 0);
  // Toplam ve ortalama süreyi saat+dakika olarak göster
  const formatHours = (mins) => {
    const h = Math.floor((mins || 0) / 60);
    const m = Math.floor((mins || 0) % 60);
    return `${h} ${t('stopwatch.hours_abbr')} ${m} ${t('stopwatch.minutes_abbr')}`;
  };
  
  const calculateAverage = () => {
    if (stats.length === 0) return 0;
    if (activePeriod === 'week') {
      return Math.round(totalStudyTime / 7);
    }
    if (activePeriod === 'month') {
      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      return Math.round(totalStudyTime / daysInMonth);
    }
    if (activePeriod === 'year') {
      const now = new Date();
      const year = now.getFullYear();
      const isLeap = new Date(year, 1, 29).getMonth() === 1;
      const daysInYear = isLeap ? 366 : 365;
      return Math.round(totalStudyTime / daysInYear);
    }
    if (activePeriod === 'last_1m') return Math.round(totalStudyTime / 30);
    if (activePeriod === 'last_3m') return Math.round(totalStudyTime / 90);
    if (activePeriod === 'last_6m') return Math.round(totalStudyTime / 180);
    if (activePeriod === 'last_1y') return Math.round(totalStudyTime / 365);
    return Math.round(totalStudyTime / 7);
  };

  const averageStudyTime = calculateAverage();
  const today = new Date();
  const locale = language === 'en' ? 'en-US' : (language === 'es' ? 'es-ES' : (language === 'ar' ? 'ar' : 'tr-TR'));
  const todayString = today.toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });

  const getEmptyMessage = (period) => {
    const now = new Date();
    const locale = language === 'en' ? 'en-US' : (language === 'es' ? 'es-ES' : (language === 'ar' ? 'ar' : 'tr-TR'));
    if (period === 'week') return t('empty.period.week');
    if (period === 'last_1w') return t('empty.period.last_1w');
    if (period === 'month') {
      const monthName = now.toLocaleDateString(locale, { month: 'long' });
      const year = now.getFullYear();
      return t('empty.period.month', { month: monthName.charAt(0).toUpperCase() + monthName.slice(1), year });
    }
    if (period === 'last_1m') return t('empty.period.last_1m');
    if (period === 'last_3m') return t('empty.period.last_3m');
    if (period === 'last_6m') return t('empty.period.last_6m');
    if (period === 'year') return t('empty.period.year');
    if (period === 'last_1y') return t('empty.period.last_1y');
    return t('empty.stats');
  };

  const getMostStudiedSubject = () => {
    if (stats.length === 0) return t('common.na');
    const subjects = {};
    stats.forEach(session => {
      if (session.subject) {
        subjects[session.subject] = (subjects[session.subject] || 0) + (session.duration || 0);
      }
    });
    let maxSubject = t('common.na');
    let maxTime = 0;
    Object.entries(subjects).forEach(([subject, time]) => {
      if (time > maxTime) {
        maxSubject = subject;
        maxTime = time;
      }
    });
    return maxSubject;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border, paddingTop: insets.top + 16 }]}>
        <Text style={[styles.title, { color: theme.text }]}>{t('statistics.title')}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{t('statistics.subtitle')}</Text>
      </View>
      
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.comboBoxContainer, showPeriodMenu && { zIndex: 1000 }]}>
          <Pressable
            style={[styles.comboBox, { borderColor: theme.border, backgroundColor: theme.card }]}
            onPress={() => setShowPeriodMenu((v) => !v)}
            android_ripple={undefined}
            hitSlop={8}
          >
            <Text style={[styles.comboLabel, { color: theme.text }]}> 
              {periodOptions.find((p) => p.key === activePeriod)?.label || t('period.week')}
            </Text>
            <Ionicons name={showPeriodMenu ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
          </Pressable>
          {showPeriodMenu && (
            <>
              <TouchableOpacity style={[styles.overlay]} onPress={() => setShowPeriodMenu(false)} />
              <View style={[styles.dropdown, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                {periodOptions.map((opt) => {
                  const premiumKeys = ['last_3m', 'last_6m', 'year', 'last_1y'];
                  const isPremiumOption = premiumKeys.includes(opt.key);
                  const isActive = activePeriod === opt.key;
                  const isPremiumAllowed = adsDisabled || isTurkeyRegion();
                  return (
                    <Pressable
                      key={opt.key}
                      style={[
                        styles.dropdownItem,
                        isActive && styles.dropdownItemActive,
                        isActive && { backgroundColor: theme.primary },
                      ]}
                      onPress={() => {
                        if (isPremiumOption && !isPremiumAllowed) {
                          setShowPeriodMenu(false);
                          navigation.navigate('Settings', { openPlans: true });
                          return;
                        }
                        setActivePeriod(opt.key);
                        setShowPeriodMenu(false);
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <Text style={{ color: isActive ? '#fff' : theme.text }}>{opt.label}</Text>
                        {isPremiumOption && (
                          <Ionicons name="star" size={16} color={isActive ? '#fff' : theme.primary} />
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
        </View>
        <AdsBanner
              unitId={bannerUnitId}
              containerStyle={{
                paddingHorizontal: spacing.sm,
                paddingTop: 8,
                paddingBottom: 8,
                marginTop: spacing.sm,
                marginBottom: spacing.sm,
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.background,
              }}
            />
        <View style={[styles.todayRow, { borderColor: theme.border }]}> 
          <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
          <Text style={[styles.todayText, { color: theme.textSecondary }]}> {t('common.today')}: {todayString}</Text>
        </View>
        
        {stats.length > 0 ? (
          <>
            <ChartCard
              data={stats}
              title={
                activePeriod === 'week' ? t('chart.title_week') :
                activePeriod === 'last_1w' ? t('chart.title_last_1w') :
                activePeriod === 'month' ? t('chart.title_month') :
                activePeriod === 'year' ? t('chart.title_year') :
                activePeriod === 'last_1m' ? t('chart.title_last_1m') :
                activePeriod === 'last_3m' ? t('chart.title_last_3m') :
                activePeriod === 'last_6m' ? t('chart.title_last_6m') :
                t('chart.title_last_1y')
              }
              period={activePeriod}
            />
            {/* Banner Ad - özet karttan hemen önce konumlandırıldı */}
            
            <View
              style={[
                styles.summaryCard,
                { backgroundColor: theme.card, borderColor: theme.border, borderRadius: borderRadius.lg }
              ]}
            >
              <Text style={[styles.summaryTitle, { color: theme.text }]}>{t('summary.title')}</Text>
              <View style={[styles.statRow, { flexWrap: 'wrap' }]}>
                <View style={styles.statItem}>
                  <Ionicons name="time-outline" size={24} color={theme.primary} />
                  <Text style={[styles.statValue, { color: theme.text }]}>{formatHours(totalStudyTime)}</Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('summary.total')}</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="calendar-outline" size={24} color={theme.primary} />
                  <Text style={[styles.statValue, { color: theme.text }]}>{formatHours(averageStudyTime)}</Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('summary.daily_avg')}</Text>
                </View>
              </View>
            </View>
            {/* Alt boşluk için kaydırma sonuna padding eklendi */}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="analytics-outline" size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.text }]}>{getEmptyMessage(activePeriod)}</Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>{t('empty.stats.subtext')}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 16,
    borderBottomWidth: 1,
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
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  periodSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  periodButton: {
    paddingHorizontal: 12,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 4,
    marginVertical: 4,
    minWidth: 96,
  },
  activePeriod: {
    borderWidth: 0,
  },
  periodButtonText: {
    fontWeight: '600',
    fontSize: 13,
  },
  comboBoxContainer: {
    marginBottom: 16,
    position: 'relative',
    overflow: 'visible',
  },
  comboBox: {
    height: 40,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  comboLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  dropdown: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 1001,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dropdownItemActive: {
    borderRadius: 12,
    marginHorizontal: 0,
    marginVertical: 0,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  summaryCard: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    borderTopWidth: 1,
    marginBottom: 8,
  },
  todayText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default StatisticsScreen;
