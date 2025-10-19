import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

/**
 * ChartCard component for displaying study statistics
 * @param {Object} props - Component props
 * @param {Array} props.data - Array of data points for the chart
 * @param {String} props.title - Title of the chart
 * @param {String} props.period - Time period (week, month)
 */
const ChartCard = ({ data, title, period }) => {
  const { theme, spacing, borderRadius, shadow } = useTheme();
  const { t } = useLanguage();
  const { width: windowWidth } = useWindowDimensions();
  const contentPadding = 16;
  const cardPadding = 16;
  const chartWidth = Math.max(220, Math.floor(windowWidth - contentPadding * 2 - cardPadding * 2));

  // Process data for chart display
  const processChartData = () => {
    // Default empty data
    const defaultLabels = [
      t('chart.days.mon'),
      t('chart.days.tue'),
      t('chart.days.wed'),
      t('chart.days.thu'),
      t('chart.days.fri'),
      t('chart.days.sat'),
      t('chart.days.sun'),
    ];
    const defaultData = {
      labels: defaultLabels,
      datasets: [
        {
          data: [0, 0, 0, 0, 0, 0, 0],
          color: () => theme.primary,
          strokeWidth: 2,
        },
      ],
    };
    
    // If no data, return default
    if (!data || data.length === 0) {
      return defaultData;
    }
    
    // Process data based on period
    if (period === 'week') {
      // Group by day of week (Monday-first)
      const daysOfWeek = defaultLabels;
      const dailyTotals = [0, 0, 0, 0, 0, 0, 0];
      
      data.forEach(session => {
        const date = new Date(session.date);
        const dayIndexSundayFirst = date.getDay(); // 0=Sun..6=Sat
        const mondayFirstIndex = (dayIndexSundayFirst + 6) % 7; // 0=Mon..6=Sun
        dailyTotals[mondayFirstIndex] += session.duration || 0;
      });
      
      return {
        labels: daysOfWeek,
        datasets: [
          {
            data: dailyTotals,
            color: () => theme.primary,
            strokeWidth: 2,
          },
        ],
      };
    } else if (period === 'month') {
      // Group by week of month
      const weeks = Array.from({ length: 5 }, (_, i) => t('chart.week', { index: i + 1 }));
      const weeklyTotals = [0, 0, 0, 0, 0];
      
      data.forEach(session => {
        const date = new Date(session.date);
        const weekOfMonth = Math.floor((date.getDate() - 1) / 7); // 0..4
        weeklyTotals[weekOfMonth] += session.duration || 0;
      });
      
      return {
        labels: weeks,
        datasets: [
          {
            data: weeklyTotals,
            color: () => theme.primary,
            strokeWidth: 2,
          },
        ],
      };
    }
    
    // Default fallback
    return defaultData;
  };

  const chartData = processChartData();
  const totalStudyTime = data?.reduce((total, session) => total + (session.duration || 0), 0) || 0;
  const hours = Math.floor(totalStudyTime / 60);
  const minutes = totalStudyTime % 60;
  const totalFormatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

  return (
    <View
      style={[
        styles.card,
        shadow.md,
        {
          backgroundColor: theme.card,
          borderRadius: borderRadius.lg,
          borderColor: theme.border,
          marginBottom: spacing.lg,
          overflow: 'hidden'
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{t('summary.total')}: {totalFormatted}</Text>
      </View>
      <LineChart
        data={chartData}
        width={chartWidth}
        height={220}
        chartConfig={{
          backgroundColor: theme.card,
          backgroundGradientFrom: theme.card,
          backgroundGradientTo: theme.card,
          decimalPlaces: 0,
          color: (opacity = 1) => theme.primary,
          labelColor: (opacity = 1) => theme.textSecondary,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: '6',
            strokeWidth: '2',
            stroke: theme.primary,
          },
        }}
        bezier
        style={{
          marginVertical: 8,
          borderRadius: 16,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderWidth: 1,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
});

export default ChartCard;