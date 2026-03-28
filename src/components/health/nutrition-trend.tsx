import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { HealthCard, EmptyState } from './health-card';
import { useChartWidth } from './use-chart-width';
import { aggregateWeekly, chartLabelStyle } from '../../utils/chart-helpers';
import type { DailyNutrition, TimeRange } from '../../hooks/use-health-trends';
import { format, parseISO } from 'date-fns';

interface Props {
  data: DailyNutrition[];
  calorieTarget: number;
  range: TimeRange;
}

function aggregateNutritionWeekly(points: DailyNutrition[]): DailyNutrition[] {
  return aggregateWeekly(points, (week) => ({
    date: week[0].date,
    calories: Math.round(week.reduce((s, d) => s + d.calories, 0) / week.length),
    protein: Math.round(week.reduce((s, d) => s + d.protein, 0) / week.length),
  }));
}

export const NutritionTrend = React.memo(function NutritionTrend({ data, calorieTarget, range }: Props) {
  const chartWidth = useChartWidth();

  const { barData, avgCal, avgProtein, maxVal } = useMemo(() => {
    const points = range === '90d' ? aggregateNutritionWeekly(data) : data;
    const labelInterval = Math.max(1, Math.floor(points.length / 6));

    const cals = data.map((d) => d.calories);
    const proteins = data.map((d) => d.protein);
    const max = Math.max(calorieTarget * 1.3, ...cals, 100);

    return {
      barData: points.map((p, i) => ({
        value: p.calories,
        label: i % labelInterval === 0 ? format(parseISO(p.date), 'd') : '',
        frontColor: p.calories > calorieTarget ? Colors.warning : Colors.purple,
      })),
      avgCal: cals.length ? Math.round(cals.reduce((a, b) => a + b, 0) / cals.length) : 0,
      avgProtein: proteins.length ? Math.round(proteins.reduce((a, b) => a + b, 0) / proteins.length) : 0,
      maxVal: Math.ceil(max / 100) * 100,
    };
  }, [data, calorieTarget, range]);

  return (
    <HealthCard title="🔥 Nutrition" borderColor={Colors.success}>
      {data.length === 0 ? (
        <EmptyState message="Log meals in the Food tab to see trends! 🍽️" />
      ) : (
        <>
          <BarChart
            data={barData}
            width={chartWidth}
            height={140}
            barWidth={Math.min(24, Math.max(8, chartWidth / Math.max(barData.length * 2, 1)))}
            barBorderRadius={4}
            maxValue={maxVal}
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
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>
              Avg: {avgCal.toLocaleString()} cal · {avgProtein}g protein
            </Text>
          </View>
        </>
      )}
    </HealthCard>
  );
});

const styles = StyleSheet.create({
  summaryRow: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  summaryText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
  },
});
