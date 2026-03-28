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

export const OuraHrvTrend = React.memo(function OuraHrvTrend({ data, range }: Props) {
  const chartWidth = useChartWidth();

  const { chartData, avgHrv } = useMemo(() => {
    const filtered = data.filter((d) => d.hrv_average != null);
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const rangeData = filtered.filter((d) => d.log_date >= cutoffStr);

    const labelInterval = Math.max(1, Math.floor(rangeData.length / 6));

    return {
      chartData: rangeData.map((d, i) => ({
        value: Number(d.hrv_average) ?? 0,
        label: i % labelInterval === 0 ? format(parseISO(d.log_date), 'd') : '',
      })),
      avgHrv:
        rangeData.length > 0
          ? Math.round(
              rangeData.reduce((sum, d) => sum + Number(d.hrv_average ?? 0), 0) /
                rangeData.length,
            )
          : null,
    };
  }, [data, range]);

  return (
    <HealthCard title="💓 HRV Trend" borderColor={Colors.pink}>
      {chartData.length === 0 ? (
        <EmptyState message="HRV data will appear once your Oura Ring syncs! 💓" />
      ) : (
        <>
          <LineChart
            data={chartData}
            width={chartWidth}
            height={140}
            spacing={Math.max(20, chartWidth / Math.max(chartData.length, 1))}
            color1={Colors.pink}
            dataPointsColor1={Colors.pink}
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
            yAxisLabelSuffix=" ms"
          />
          {avgHrv != null && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryText}>
                Avg: {avgHrv} ms
              </Text>
            </View>
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
});
