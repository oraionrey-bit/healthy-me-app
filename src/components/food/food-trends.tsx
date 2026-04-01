import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { PixelCard } from '../ui';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useChartWidth } from '../health/use-chart-width';
import { chartLabelStyle } from '../../utils/chart-helpers';
import { useFoodTrends } from '../../hooks/use-food-trends';
import type { TrendRange, DayNutrition } from '../../hooks/use-food-trends';
import { useUserProfile } from '../../hooks/use-user-profile';
import { format, parseISO } from 'date-fns';

function formatDayLabel(dateStr: string, range: TrendRange): string {
  try {
    const d = parseISO(dateStr);
    return range === 'week'
      ? format(d, 'EEE')  // Mon, Tue, etc.
      : format(d, 'd');    // 1, 2, 3, etc.
  } catch {
    return '';
  }
}

export function FoodTrends({ onClose }: { onClose: () => void }) {
  const { daily, summary, range, setRange, loading } = useFoodTrends();
  const { calorieTarget, proteinTarget } = useUserProfile();
  const chartWidth = useChartWidth();

  const calLower = calorieTarget - 100;
  const calUpper = calorieTarget + 100;

  const { calBarData, protBarData, calMax, protMax } = useMemo(() => {
    const labelInterval = range === 'week' ? 1 : Math.max(1, Math.floor(daily.length / 7));

    const calBars = daily.map((d, i) => ({
      value: d.calories,
      label: i % labelInterval === 0 ? formatDayLabel(d.date, range) : '',
      frontColor: d.calories > 0 && d.calories >= calLower && d.calories <= calUpper
        ? Colors.success
        : d.calories > calUpper
          ? Colors.warning
          : Colors.purple,
    }));

    const protBars = daily.map((d, i) => ({
      value: d.protein,
      label: i % labelInterval === 0 ? formatDayLabel(d.date, range) : '',
      frontColor: d.protein >= proteinTarget ? Colors.success : Colors.purple,
    }));

    const maxCal = Math.max(2000, ...daily.map((d) => d.calories));
    const maxProt = Math.max(120, ...daily.map((d) => d.protein));

    return {
      calBarData: calBars,
      protBarData: protBars,
      calMax: Math.ceil(maxCal / 500) * 500,
      protMax: Math.ceil(maxProt / 20) * 20,
    };
  }, [daily, range]);

  const barWidth = range === 'week'
    ? Math.min(28, Math.max(12, chartWidth / 20))
    : Math.min(14, Math.max(4, chartWidth / Math.max(daily.length * 2, 1)));

  if (loading && daily.length === 0) {
    return (
      <PixelCard style={styles.card}>
        <Text style={styles.loadingText}>Loading trends...</Text>
      </PixelCard>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📊 Food Trends</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Range Toggle */}
      <View style={styles.rangeRow}>
        <TouchableOpacity
          style={[styles.rangePill, range === 'week' && styles.rangePillActive]}
          onPress={() => setRange('week')}
        >
          <Text style={[styles.rangePillText, range === 'week' && styles.rangePillTextActive]}>
            This Week
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.rangePill, range === 'month' && styles.rangePillActive]}
          onPress={() => setRange('month')}
        >
          <Text style={[styles.rangePillText, range === 'month' && styles.rangePillTextActive]}>
            This Month
          </Text>
        </TouchableOpacity>
      </View>

      {summary.totalDays === 0 ? (
        <PixelCard style={styles.card}>
          <Text style={styles.emptyText}>No food data yet for this period 🍽️</Text>
          <Text style={styles.emptyHint}>Log meals to see your trends!</Text>
        </PixelCard>
      ) : (
        <>
          {/* Calorie Chart */}
          <PixelCard style={styles.card}>
            <Text style={styles.chartTitle}>🔥 Calories</Text>
            <BarChart
              data={calBarData}
              width={chartWidth}
              height={130}
              barWidth={barWidth}
              barBorderRadius={4}
              maxValue={calMax}
              noOfSections={4}
              yAxisTextStyle={chartLabelStyle}
              xAxisLabelTextStyle={chartLabelStyle}
              rulesColor={Colors.tabBarBorder}
              rulesType="dashed"
              showReferenceLine1
              referenceLine1Position={calorieTarget}
              referenceLine1Config={{
                color: Colors.pink,
                dashWidth: 6,
                dashGap: 4,
                thickness: 1.5,
              }}
              isAnimated={false}
              disableScroll
              initialSpacing={8}
              endSpacing={8}
            />
            <Text style={styles.targetLine}>— Target: {calorieTarget.toLocaleString()} cal</Text>
          </PixelCard>

          {/* Protein Chart */}
          <PixelCard style={styles.card}>
            <Text style={styles.chartTitle}>🥩 Protein</Text>
            <BarChart
              data={protBarData}
              width={chartWidth}
              height={130}
              barWidth={barWidth}
              barBorderRadius={4}
              maxValue={protMax}
              noOfSections={4}
              yAxisTextStyle={chartLabelStyle}
              xAxisLabelTextStyle={chartLabelStyle}
              rulesColor={Colors.tabBarBorder}
              rulesType="dashed"
              showReferenceLine1
              referenceLine1Position={proteinTarget}
              referenceLine1Config={{
                color: Colors.pink,
                dashWidth: 6,
                dashGap: 4,
                thickness: 1.5,
              }}
              isAnimated={false}
              disableScroll
              initialSpacing={8}
              endSpacing={8}
            />
            <Text style={styles.targetLine}>— Target: {proteinTarget}g protein</Text>
          </PixelCard>

          {/* Summary Stats */}
          <PixelCard style={styles.card}>
            <Text style={styles.chartTitle}>📋 Summary</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{summary.avgCalories}</Text>
                <Text style={styles.statLabel}>Avg Cal</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{summary.avgProtein}g</Text>
                <Text style={styles.statLabel}>Avg Protein</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{summary.daysOnProteinTarget}/{summary.totalDays}</Text>
                <Text style={styles.statLabel}>Days on Target</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{summary.daysOnCalorieTarget}/{summary.totalDays}</Text>
                <Text style={styles.statLabel}>Cal on Target</Text>
              </View>
            </View>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{summary.highCalories}</Text>
                <Text style={styles.statLabel}>High Cal</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{summary.lowCalories}</Text>
                <Text style={styles.statLabel}>Low Cal</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{summary.highProtein}g</Text>
                <Text style={styles.statLabel}>High Protein</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{summary.lowProtein}g</Text>
                <Text style={styles.statLabel}>Low Protein</Text>
              </View>
            </View>
          </PixelCard>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.softPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.error,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  rangePill: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    alignItems: 'center',
  },
  rangePillActive: {
    backgroundColor: Colors.purple,
    borderColor: Colors.purple,
  },
  rangePillText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
  },
  rangePillTextActive: {
    color: Colors.textOnDark,
  },
  card: {
    marginBottom: 0,
  },
  chartTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  targetLine: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.pink,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  statValue: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.purple,
  },
  statLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  loadingText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
  emptyHint: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
