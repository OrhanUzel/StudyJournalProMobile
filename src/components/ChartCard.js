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
  const { t, language } = useLanguage();
  const { width: windowWidth } = useWindowDimensions();
  const contentPadding = 16;
  const cardPadding = 16;
  const chartWidth = Math.max(220, Math.floor(windowWidth - contentPadding * 2 - cardPadding * 2));
  // X ekseni etiketleri: Aylık görünümlerde tüm günler gösterilecek.
  // Çakışmayı önlemek için etiketleri aylıkta dikey döndürüyoruz.

  // Process data for chart display (yarım saat adımlarına yuvarla)
  const toHoursHalf = (mins) => {
    const hours = (mins || 0) / 60;
    return Math.round(hours * 2) / 2; // 0.5 adımlar
  };
  const parseDateLocal = (val) => {
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [y, m, d] = val.split('-').map(Number);
      return new Date(y, (m || 1) - 1, d || 1);
    }
    return new Date(val);
  };

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
        const date = parseDateLocal(session.date);
        const dayIndexSundayFirst = date.getDay(); // 0=Sun..6=Sat
        const mondayFirstIndex = (dayIndexSundayFirst + 6) % 7; // 0=Mon..6=Sun
        dailyTotals[mondayFirstIndex] += session.duration || 0;
      });
      
      return {
        labels: daysOfWeek,
        datasets: [
          {
            data: dailyTotals.map(toHoursHalf),
            color: () => theme.primary,
            strokeWidth: 2,
          },
        ],
      };
    } else if (period === 'month') {
      // This month: show all days
      const now = new Date();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
      const dailyTotals = Array.from({ length: daysInMonth }, () => 0);

      data.forEach((session) => {
        const date = parseDateLocal(session.date);
        const dayIndex = date.getDate() - 1;
        if (dayIndex >= 0 && dayIndex < daysInMonth) {
          dailyTotals[dayIndex] += session.duration || 0;
        }
      });

      return {
        labels,
        datasets: [
          { data: dailyTotals.map(toHoursHalf), color: () => theme.primary, strokeWidth: 2 },
        ],
      };
    } else if (period === 'last_1w') {
      // Last 7 days: show daily
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        d.setHours(0, 0, 0, 0);
        return d;
      });
      const locale = language === 'en' ? 'en-US' : 'tr-TR';
      const labels = days.map((d) => d.toLocaleDateString(locale, { weekday: 'short' }));
      const totals = Array.from({ length: 7 }, () => 0);
      const startTime = days[0].getTime();

      data.forEach((session) => {
        const d = parseDateLocal(session.date);
        const idx = Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - startTime) / (24*3600*1000));
        if (idx >= 0 && idx < 7) {
          totals[idx] += session.duration || 0;
        }
      });

      return {
        labels,
        datasets: [
          { data: totals.map(toHoursHalf), color: () => theme.primary, strokeWidth: 2 },
        ],
      };
    } else if (period === 'last_1m') {
      // Last 30 days: show daily
      const days = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        d.setHours(0, 0, 0, 0);
        return d;
      });
      const locale = language === 'en' ? 'en-US' : 'tr-TR';
      const labels = days.map((d) => d.toLocaleDateString(locale, { day: '2-digit' }));
      const totals = Array.from({ length: 30 }, () => 0);
      const startTime = days[0].getTime();

      data.forEach((session) => {
        const d = parseDateLocal(session.date);
        const idx = Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - startTime) / (24*3600*1000));
        if (idx >= 0 && idx < 30) {
          totals[idx] += session.duration || 0;
        }
      });

      return {
        labels,
        datasets: [
          { data: totals.map(toHoursHalf), color: () => theme.primary, strokeWidth: 2 },
        ],
      };
    } else if (period === 'last_3m' || period === 'last_6m' || period === 'last_1y') {
      // Group by calendar month for multi-month ranges
      const monthsCount = period === 'last_3m' ? 3 : period === 'last_6m' ? 6 : 12;
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - (monthsCount - 1), 1);
      const months = Array.from({ length: monthsCount }, (_, i) => {
        const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
        return d;
      });
      const monthlyTotals = Array.from({ length: monthsCount }, () => 0);
      const startKey = start.getFullYear() * 12 + start.getMonth();

      data.forEach((session) => {
        const d = parseDateLocal(session.date);
        const key = d.getFullYear() * 12 + d.getMonth();
        const idx = key - startKey;
        if (idx >= 0 && idx < monthsCount) {
          monthlyTotals[idx] += session.duration || 0;
        }
      });

      const locale = language === 'en' ? 'en-US' : 'tr-TR';
      const labels = months.map((d) => d.toLocaleDateString(locale, { month: 'short' }));
      // Aylık günlük ortalama (dakika/gün -> saat)
      const averages = months.map((d, i) => {
        const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        const avgMinutesPerDay = monthlyTotals[i] / daysInMonth;
        const hours = avgMinutesPerDay / 60;
        return Math.round(hours * 2) / 2;
      });
      return {
        labels,
        datasets: [
          { data: averages, color: () => theme.primary, strokeWidth: 2 },
        ],
      };
    } else if (period === 'year') {
      // Current year grouped by month
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      const months = Array.from({ length: 12 }, (_, i) => new Date(start.getFullYear(), i, 1));
      const monthlyTotals = Array.from({ length: 12 }, () => 0);
      const startKey = start.getFullYear() * 12 + 0;

      data.forEach((session) => {
        const d = parseDateLocal(session.date);
        const key = d.getFullYear() * 12 + d.getMonth();
        const idx = key - startKey;
        if (idx >= 0 && idx < 12) {
          monthlyTotals[idx] += session.duration || 0;
        }
      });

      const locale = language === 'en' ? 'en-US' : 'tr-TR';
      const labels = months.map((d) => d.toLocaleDateString(locale, { month: 'short' }));
      const averages = months.map((d, i) => {
        const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        const avgMinutesPerDay = monthlyTotals[i] / daysInMonth;
        const hours = avgMinutesPerDay / 60;
        return Math.round(hours * 2) / 2;
      });
      return {
        labels,
        datasets: [
          { data: averages, color: () => theme.primary, strokeWidth: 2 },
        ],
      };
    }
    
    // Default fallback
    return defaultData;
  };

  const chartData = processChartData();
  const isAverageMode = period === 'last_3m' || period === 'last_6m' || period === 'last_1y' || period === 'year';
  const isMonthly = period === 'month' || period === 'last_1m';
  const legendLabel = isAverageMode
    ? (language === 'en' ? 'Daily Average (h/day)' : 'Günlük Ortalama (sa/gün)')
    : (language === 'en' ? 'Total Study Time' : 'Toplam Çalışma Süresi');
  const yValues = chartData?.datasets?.[0]?.data || [0];
  const maxYValue = Math.max(...yValues);
  // Çok aylı görünümlerde (ortalama modları) yatay çizgileri her zaman göster
  const showInnerGrid = isAverageMode ? true : maxYValue > 1;
  // 4 saat altı: 0.5 adımlar, 4 ve üzeri: tam saat adımları
  const useHalfSteps = maxYValue < 4;
  const segmentsCount = useHalfSteps
    ? Math.max(2, Math.min(24, Math.ceil(maxYValue * 2)))
    : Math.min(24, Math.max(1, Math.ceil(maxYValue)));
  const totalStudyTime = data?.reduce((total, session) => total + (session.duration || 0), 0) || 0;
  const totalHours = Math.round(totalStudyTime / 60);
  const labelRotation = isMonthly ? 90 : 0;
  const labelFontSize = isMonthly ? 9 : 10;
  const dotProps = { r: isMonthly ? '4' : '6', strokeWidth: isMonthly ? '1.5' : '2', stroke: theme.primary };

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
        {/* Üstte, grafikten bağımsız kompakt lejant */}
        <View style={[styles.legendPillStatic, { backgroundColor: theme.card, borderColor: theme.border }]}> 
          <View style={[styles.legendDot, { backgroundColor: theme.primary }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>{legendLabel}</Text>
        </View>
      </View>
      <View style={styles.chartWrap}>
        <LineChart
          data={chartData}
          width={chartWidth}
          height={220}
          chartConfig={{
            backgroundColor: theme.card,
            backgroundGradientFrom: theme.card,
            backgroundGradientTo: theme.card,
            // 4 saat altı yarım saat, 4 ve üzeri tam saat
            decimalPlaces: (useHalfSteps || isAverageMode) ? 1 : 0,
            color: (opacity = 1) => theme.primary,
            labelColor: (opacity = 1) => theme.textSecondary,
            propsForLabels: {
              fontSize: labelFontSize,
            },
            formatYLabel: (lbl) => {
              const n = Number(lbl);
              if (!isFinite(n)) return lbl;
              if (n === 0) return '0';
              if (useHalfSteps) {
                // Yalnızca 0.5 katları
                const halfStep = Math.round(n * 2) / 2;
                const isHalfMultiple = Math.abs(n - halfStep) < 1e-6;
                if (!isHalfMultiple) return '';
                const isInteger = Math.abs(halfStep - Math.round(halfStep)) < 1e-6;
                return isInteger ? String(Math.round(halfStep)) : halfStep.toFixed(1);
              }
              // Tam saat adımları: sadece tam sayıları göster
              const isInteger = Math.abs(n - Math.round(n)) < 1e-6;
              return isInteger ? String(Math.round(n)) : '';
            },
            style: {
              borderRadius: 16,
            },
            propsForBackgroundLines: {
              strokeDasharray: '0',
              stroke: theme.border,
              strokeWidth: 1,
            },
            propsForDots: dotProps,
          }}
          fromZero
          yLabelsOffset={12}
          xLabelsOffset={isMonthly ? -2 : 0}
          verticalLabelRotation={labelRotation}
          segments={segmentsCount}
          withHorizontalLines={showInnerGrid}
          withInnerLines={showInnerGrid}
          withVerticalLines={false}
          renderDotContent={({ x, y, index, value }) => {
            if (!isAverageMode) return null;
            const isFractional = typeof value === 'number' && value > 0 && Math.abs(value % 1) > 0.0001;
            if (!isFractional) return null;
            return (
              <Text
                style={{
                  position: 'absolute',
                  left: x - 12,
                  top: y - 22,
                  color: theme.textSecondary,
                  fontSize: 12,
                  fontWeight: '600',
                }}
              >
                {Number(value).toFixed(1)}
              </Text>
            );
          }}
          style={{
            marginVertical: 8,
            borderRadius: 16,
            marginHorizontal: -cardPadding,
          }}
        />
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  chartWrap: {
    position: 'relative',
  },
  legendPillStatic: {
    marginLeft: 'auto',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
});

export default ChartCard;