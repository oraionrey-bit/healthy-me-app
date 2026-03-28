import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { HealthCard, EmptyState } from './health-card';
import { useChartWidth } from './use-chart-width';
import { chartLabelStyle } from '../../utils/chart-helpers';
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

  const { chartData, avgTemp } = useMemo(() => {
    const filtered = data.filter((d) => d.temperature_deviation != null);
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const rangeData = filtered.filter((d) => d.log_date >= cutoffStr);

    const labelInterval = Math.max(1, Math.floor(rangeData.length / 6));

    return {
      chartData: rangeData.map((d, i) => ({
        value: Number(d.temperature_deviation) ?? 0,
        label: i % labelInterval === 0 ? format(parseISO(d.log_date), 'd') : '',
      })),
      avgTemp:
        rangeData.length > 0
          ? (
              rangeData.reduce(
                (sum, d) => sum + Number(d.temperature_deviation ?? 0),
                0,
              ) / rangeData.length
            ).toFixed(2)
          : null,
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
            yAxisLabelSuffix="°"
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
            <Text style={styles.hintText}>
              Temperature shifts may correlate with cycle phases 🌸
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
    gap: Spacing.xs,
  },
  summaryText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
  },
  hintText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
