import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { HealthCard, EmptyState } from './health-card';
import { useChartWidth } from './use-chart-width';
import { aggregateWeekly, chartLabelStyle } from '../../utils/chart-helpers';
import { getWeightInsight } from '../../utils/chart-insights';
import type { WeightPoint, TimeRange } from '../../hooks/use-health-trends';
import { format, parseISO } from 'date-fns';

interface Props {
  data: WeightPoint[];
  range: TimeRange;
  unit?: 'lbs' | 'kg';
}

function aggregateWeightWeekly(points: WeightPoint[]): WeightPoint[] {
  return aggregateWeekly(points, (week) => ({
    date: week[0].date,
    weight: Math.round((week.reduce((s, d) => s + d.weight, 0) / week.length) * 10) / 10,
  }));
}

export const WeightTrend = React.memo(function WeightTrend({ data, range, unit = 'lbs' }: Props) {
  const chartWidth = useChartWidth();

  const { lineData, current, change, minVal, maxVal, insight } = useMemo(() => {
    const points = range === '90d' ? aggregateWeightWeekly(data) : data;
    const labelInterval = Math.max(1, Math.floor(points.length / 6));

    const weights = data.map((d) => d.weight);
    const min = weights.length ? Math.floor(Math.min(...weights) - 2) : 0;
    const max = weights.length ? Math.ceil(Math.max(...weights) + 2) : 200;

    const chartPoints = points.map((p, i) => ({
      value: p.weight,
      label: i % labelInterval === 0 ? format(parseISO(p.date), 'd') : '',
    }));

    return {
      lineData: chartPoints,
      current: weights.length ? weights[weights.length - 1] : null,
      change: weights.length >= 2 ? weights[weights.length - 1] - weights[0] : null,
      minVal: min,
      maxVal: max,
      insight: getWeightInsight(chartPoints, unit),
    };
  }, [data, range, unit]);

  return (
    <HealthCard title="⚖️ Weight" borderColor={Colors.babyBlue}>
      {data.length === 0 ? (
        <EmptyState message="Log your weight to see trends ⚖️" />
      ) : (
        <>
          <LineChart
            data={lineData}
            width={chartWidth}
            height={140}
            spacing={Math.max(20, chartWidth / Math.max(lineData.length, 1))}
            color={Colors.babyBlue}
            dataPointsColor={Colors.babyBlue}
            dataPointsRadius={3}
            thickness={2}
            maxValue={maxVal}
            yAxisOffset={minVal}
            noOfSections={4}
            yAxisTextStyle={chartLabelStyle}
            xAxisLabelTextStyle={chartLabelStyle}
            rulesColor={Colors.tabBarBorder}
            rulesType="dashed"
            curved
            areaChart
            startFillColor={Colors.babyBlue}
            startOpacity={0.25}
            endFillColor={Colors.babyBlue}
            endOpacity={0.05}
            hideDataPoints={lineData.length > 15}
            isAnimated={false}
            disableScroll
            initialSpacing={8}
            endSpacing={8}
          />
          <View style={styles.summaryRow}>
            {current != null && (
              <Text style={styles.summaryText}>Current: {current} {unit}</Text>
            )}
            {change != null && (
              <Text style={styles.summaryText}>
                Change: {change > 0 ? '+' : ''}{change.toFixed(1)} {unit}
              </Text>
            )}
          </View>
          {insight.length > 0 && (
            <Text style={styles.insightText}>{insight}</Text>
          )}
        </>
      )}
    </HealthCard>
  );
});

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.sm,
  },
  summaryText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
  },
  insightText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
});
