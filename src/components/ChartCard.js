import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '../context/ThemeContext';

/**
 * ChartCard component for displaying study statistics
 * @param {Object} props - Component props
 * @param {Array} props.data - Array of data points for the chart
 * @param {String} props.title - Title of the chart
 * @param {String} props.period - Time period (week, month)
 */
const ChartCard = ({ data, title, period }) => {
  const { theme, spacing, borderRadius, shadow } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const contentPadding = 16;
  const cardPadding = 16;
  const chartWidth = Math.max(220, Math.floor(windowWidth - contentPadding * 2 - cardPadding * 2));
  
  // Process data for chart display
  const processChartData = () => {
    // Default empty data
    const defaultData = {
      labels: ['Paz', 'Pts', 'Sal', 'Çar', 'Per', 'Cum', 'Cts'],
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
      // Group by day of week
      const daysOfWeek = ['Paz', 'Pts', 'Sal', 'Çar', 'Per', 'Cum', 'Cts'];
      const dailyTotals = [0, 0, 0, 0, 0, 0, 0];
      
      data.forEach(session => {
        const date = new Date(session.date);
        const dayIndex = date.getDay(); // 0 = Sunday, 6 = Saturday
        dailyTotals[dayIndex] += session.duration || 0;
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
      const weeks = ['Hafta 1', 'Hafta 2', 'Hafta 3', 'Hafta 4', 'Hafta 5'];
      const weeklyTotals = [0, 0, 0, 0, 0];
      
      data.forEach(session => {
        const date = new Date(session.date);
        const weekOfMonth = Math.floor(date.getDate() / 7);
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
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Toplam: {totalFormatted}</Text>
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