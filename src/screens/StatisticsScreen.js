import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNotes } from '../context/NotesContext';
import { useTheme } from '../context/ThemeContext';
import ChartCard from '../components/ChartCard';
import { Ionicons } from '@expo/vector-icons';

/**
 * StatisticsScreen component displays study time statistics
 */
const StatisticsScreen = () => {
  const { getStudyStats } = useNotes();
  const { theme, spacing, borderRadius } = useTheme();
  const [activePeriod, setActivePeriod] = useState('week');
  
  // Get stats for the active period
  const stats = getStudyStats(activePeriod);
  // Calculate total study time
  const totalStudyTime = stats.reduce((total, session) => total + (session.duration || 0), 0);
  const formatMinutes = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };
  
  // Calculate average study time per day
  const calculateAverage = () => {
    if (stats.length === 0) return 0;
    
    // Group by day
    const days = {};
    stats.forEach(session => {
      const date = new Date(session.date).toDateString();
      days[date] = (days[date] || 0) + (session.duration || 0);
    });
    
    // Calculate average
    const totalDays = Object.keys(days).length;
    return totalDays > 0 ? Math.round(totalStudyTime / totalDays) : 0;
  };
  
  const averageStudyTime = calculateAverage();
  
  // Get most studied subject
  const getMostStudiedSubject = () => {
    if (stats.length === 0) return 'N/A';
    
    // Group by subject
    const subjects = {};
    stats.forEach(session => {
      if (session.subject) {
        subjects[session.subject] = (subjects[session.subject] || 0) + (session.duration || 0);
      }
    });
    
    // Find subject with max time
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
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>İstatistikler</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Çalışma ilerlemeni takip et</Text>
      </View>
      
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Period Selector */}
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
              Hafta
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
              Ay
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Chart */}
        <ChartCard
          data={stats}
          title={`Çalışma Süresi (${activePeriod === 'week' ? 'Bu Hafta' : 'Bu Ay'})`}
          period={activePeriod}
        />
        {/* Stats Summary */}
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: theme.card, borderColor: theme.border, borderRadius: borderRadius.lg }
          ]}
        >
          <Text style={[styles.summaryTitle, { color: theme.text }]}>Özet</Text>
          <View style={[styles.statRow, { flexWrap: 'wrap' }]}>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={24} color={theme.primary} />
              <Text style={[styles.statValue, { color: theme.text }]}>{formatMinutes(totalStudyTime)}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Toplam Süre</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="calendar-outline" size={24} color={theme.primary} />
              <Text style={[styles.statValue, { color: theme.text }]}>{formatMinutes(averageStudyTime)}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Günlük Ortalama</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="book-outline" size={24} color={theme.primary} />
              <Text style={[styles.statValue, { color: theme.text }]} numberOfLines={1}>{getMostStudiedSubject()}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>En Çok Çalışılan Konu</Text>
            </View>
          </View>
        </View>
        {/* Empty State */}
        {stats.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="analytics-outline" size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.text }]}>Henüz çalışma verisi yok</Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>İstatistikleri görmek için çalışma notu ekleyin</Text>
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