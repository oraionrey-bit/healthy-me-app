import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { HealthCard, EmptyState } from './health-card';
import { useChartWidth } from './use-chart-width';
import { chartLabelStyle } from '../../utils/chart-helpers';
import { getSleepInsight } from '../../utils/chart-insights';
import type { OuraDaily } from '../../types/database';
import type { TimeRange } from '../../hooks/use-health-trends';
import { format, parseISO } from 'date-fns';

interface Props {
  data: OuraDaily[];
  range: TimeRange;
}

export const OuraSleepTrend = React.memo(function OuraSleepTrend({ data, range }: Props) {
  const chartWidth = useChartWidth();

  const { chartData, avgScore, insight } = useMemo(() => {
    const filtered = data.filter((d) => d.sleep_score != null);
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const rangeData = filtered.filter((d) => d.log_date >= cutoffStr);

    const labelInterval = Math.max(1, Math.floor(rangeData.length / 6));

    const points = rangeData.map((d, i) => ({
      value: d.sleep_score ?? 0,
      label: i % labelInterval === 0 ? format(parseISO(d.log_date), 'd') : '',
    }));

    return {
      chartData: points,
      avgScore:
        rangeData.length > 0
          ? Math.round(
              rangeData.reduce((sum, d) => sum + (d.sleep_score ?? 0), 0) /
                rangeData.length,
            )
          : null,
      insight: getSleepInsight(points),
    };
  }, [data, range]);

  return (
    <HealthCard title="😴 Sleep Score" borderColor={Colors.purple}>
      {chartData.length === 0 ? (
        <EmptyState message="Connect your Oura Ring and sync to see sleep trends! 💍" />
      ) : (
        <>
          <LineChart
            data={chartData}
            width={chartWidth}
            height={140}
            spacing={Math.max(20, chartWidth / Math.max(chartData.length, 1))}
            color1={Colors.purple}
            dataPointsColor1={Colors.purple}
            dataPointsRadius1={3}
            thickness={2}
            maxValue={100}
            noOfSections={4}
            yAxisTextStyle={chartLabelStyle}
            xAxisLabelTextStyle={chartLabelStyle}
            rulesColor={Colors.tabBarBorder}
            rulesType="dashed"
            curved
            hideDataPoints={chartData.length > 15}
            isAnimated={false}
            disableScroll
            initialSpacing={8}
            endSpacing={8}
          />
          {avgScore != null && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryText}>
                Avg: {avgScore}/100
              </Text>
            </View>
          )}
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
    alignItems: 'center',
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
