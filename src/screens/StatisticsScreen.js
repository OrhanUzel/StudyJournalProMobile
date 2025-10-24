import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNotes } from '../context/NotesContext';
import { useTheme } from '../context/ThemeContext';
import ChartCard from '../components/ChartCard';
import { Ionicons } from '@expo/vector-icons';
import DatabaseService from '../services/DatabaseService';
import { useIsFocused } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';

/**
 * StatisticsScreen component displays study time statistics
 */
const StatisticsScreen = () => {
  const { getStudyStats } = useNotes();
  const { theme, spacing, borderRadius } = useTheme();
  const { t } = useLanguage();
  const [activePeriod, setActivePeriod] = useState('week');
  const [stats, setStats] = useState([]);
  const isFocused = useIsFocused();
 
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
    } else {
      const s = new Date(now);
      s.setDate(now.getDate() - 7);
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
  const formatMinutes = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
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
    return Math.round(totalStudyTime / 7);
  };

  const averageStudyTime = calculateAverage();

  const getMostStudiedSubject = () => {
    if (stats.length === 0) return 'N/A';
    const subjects = {};
    stats.forEach(session => {
      if (session.subject) {
        subjects[session.subject] = (subjects[session.subject] || 0) + (session.duration || 0);
      }
    });
    let maxSubject = 'N/A';
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
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>{t('statistics.title')}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{t('statistics.subtitle')}</Text>
      </View>
      
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[
              styles.periodButton,
              activePeriod === 'week' && [styles.activePeriod, { backgroundColor: theme.primary }],
              { borderColor: theme.border, borderRadius: borderRadius.md }
            ]}
            onPress={() => setActivePeriod('week')}
          >
            <Text
              style={[styles.periodButtonText, { color: activePeriod === 'week' ? '#FFFFFF' : theme.text }]}
            >
              {t('period.week')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.periodButton,
              activePeriod === 'month' && [styles.activePeriod, { backgroundColor: theme.primary }],
              { borderColor: theme.border, borderRadius: borderRadius.md }
            ]}
            onPress={() => setActivePeriod('month')}
          >
            <Text
              style={[styles.periodButtonText, { color: activePeriod === 'month' ? '#FFFFFF' : theme.text }]}
            >
              {t('period.month')}
            </Text>
          </TouchableOpacity>
        </View>
        
        <ChartCard
          data={stats}
          title={activePeriod === 'week' ? t('chart.title_week') : t('chart.title_month')}
          period={activePeriod}
        />
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
              <Text style={[styles.statValue, { color: theme.text }]}>{formatMinutes(totalStudyTime)}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('summary.total')}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="calendar-outline" size={24} color={theme.primary} />
              <Text style={[styles.statValue, { color: theme.text }]}>{formatMinutes(averageStudyTime)}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('summary.daily_avg')}</Text>
            </View>
            
            {/* En çok çalışılan konu bölümü kaldırıldı */}
            {false && (
              <View style={styles.statItem}>
                <Ionicons name="book-outline" size={24} color={theme.primary} />
                <Text style={[styles.statValue, { color: theme.text }]} numberOfLines={1}>{/* getMostStudiedSubject() */}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('summary.most_subject')}</Text>
              </View>
            )}
          </View>
        </View>
        {stats.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="analytics-outline" size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.text }]}>{t('empty.stats')}</Text>
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
    paddingTop: 60,
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
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginHorizontal: 4,
  },
  activePeriod: {
    borderWidth: 0,
  },
  periodButtonText: {
    fontWeight: '600',
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
});

export default StatisticsScreen;