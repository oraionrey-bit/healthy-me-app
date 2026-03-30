import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { HealthCard, EmptyState } from './health-card';
import { useChartWidth } from './use-chart-width';
import { chartLabelStyle } from '../../utils/chart-helpers';
import { getTemperatureInsight } from '../../utils/chart-insights';
import type { OuraDaily } from '../../types/database';
import type { TimeRange } from '../../hooks/use-health-trends';
import { format, parseISO } from 'date-fns';

interface Props {
  data: OuraDaily[];
  range: TimeRange;
}

export const OuraTemperatureTrend = React.memo(function OuraTemperatureTrend({
  data,
  range,
}: Props) {
  const chartWidth = useChartWidth();

  const { chartData, avgTemp, insight, stepValue, yAxisOffset, maxValue } = useMemo(() => {
    const filtered = data.filter((d) => d.temperature_deviation != null);
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const rangeData = filtered.filter((d) => d.log_date >= cutoffStr);

    const labelInterval = Math.max(1, Math.floor(rangeData.length / 6));

    const points = rangeData.map((d, i) => ({
      value: Number(d.temperature_deviation) ?? 0,
      label: i % labelInterval === 0 ? format(parseISO(d.log_date), 'd') : '',
    }));

    const values = points.map((p) => p.value);
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 0;
    const dataRange = max - min;

    // Ensure meaningful Y-axis range: at least 0.2° spread
    const effectiveRange = Math.max(dataRange, 0.2);
    const padding = effectiveRange * 0.2;
    const yMin = Math.floor((min - padding) * 100) / 100;
    const yMax = Math.ceil((max + padding) * 100) / 100;
    const totalRange = yMax - yMin;
    const sections = 4;
    const step = Math.ceil((totalRange / sections) * 100) / 100;

    const avgVal =
      rangeData.length > 0
        ? (
            rangeData.reduce(
              (sum, d) => sum + Number(d.temperature_deviation ?? 0),
              0,
            ) / rangeData.length
          ).toFixed(2)
        : null;

    return {
      chartData: points,
      avgTemp: avgVal,
      insight: getTemperatureInsight(points),
      stepValue: step || 0.05,
      yAxisOffset: yMin,
      maxValue: yMin + step * sections,
    };
  }, [data, range]);

  return (
    <HealthCard title="🌡️ Temperature Deviation" borderColor={Colors.peach}>
      {chartData.length === 0 ? (
        <EmptyState message="Temperature data will appear once synced from Oura! 🌡️" />
      ) : (
        <>
          <LineChart
            data={chartData}
            width={chartWidth}
            height={140}
            spacing={Math.max(20, chartWidth / Math.max(chartData.length, 1))}
            color1="#ff8a65"
            dataPointsColor1="#ff8a65"
            dataPointsRadius1={3}
            thickness={2}
            noOfSections={4}
            stepValue={stepValue}
            yAxisOffset={yAxisOffset}
            maxValue={maxValue}
            formatYLabel={(val: string) => `${parseFloat(val).toFixed(2)}°`}
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
            showReferenceLine1
            referenceLine1Position={0}
            referenceLine1Config={{
              color: Colors.textMuted,
              dashWidth: 4,
              dashGap: 4,
            }}
          />
          <View style={styles.summaryRow}>
            {avgTemp != null && (
              <Text style={styles.summaryText}>Avg: {avgTemp}°</Text>
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
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.xs,
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
