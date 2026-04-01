import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useLabs } from '../../hooks/use-labs';
import { useChartWidth } from './use-chart-width';
import { chartLabelStyle } from '../../utils/chart-helpers';
import { computeLabStatus } from '../../constants/lab-categories';
import { format } from 'date-fns';

interface Props {
  testName: string;
}

export function LabTrendChart({ testName }: Props) {
  const { getTestHistory } = useLabs();
  const chartWidth = useChartWidth();
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);

  const history = useMemo(() => getTestHistory(testName), [testName, getTestHistory]);

  const { lineData, refLow, refHigh, minVal, maxVal, unit, sections } = useMemo(() => {
    if (history.length === 0)
      return { lineData: [], refLow: null, refHigh: null, minVal: 0, maxVal: 100, unit: '', sections: 4 };

    const rLow = history[0].reference_range_low;
    const rHigh = history[0].reference_range_high;
    const u = history[0].unit;

    const values = history.map((h) => h.value);
    const allVals = [...values];
    if (rLow != null) allVals.push(rLow);
    if (rHigh != null) allVals.push(rHigh);

    const rawMin = Math.min(...allVals);
    const rawMax = Math.max(...allVals);
    const range = rawMax - rawMin;
    // Use percentage padding but ensure minimum padding for small ranges
    const padding = Math.max(range * 0.1, 1);
    const min = Math.max(0, Math.floor(rawMin - padding));
    const max = Math.ceil(rawMax + padding);

    const labelInterval = Math.max(1, Math.floor(history.length / 6));

    const points = history.map((h, i) => {
      const status = computeLabStatus(h.value, rLow, rHigh);
      const color =
        status === 'high' || status === 'low'
          ? Colors.error
          : status === 'borderline'
            ? Colors.warning
            : Colors.success;

      return {
        value: h.value,
        label: i % labelInterval === 0
          ? format(new Date(h.test_date + 'T00:00:00'), 'M/d')
          : '',
        dataPointColor: color,
        customDataPoint: () => (
          <View style={[pointStyles.dot, { backgroundColor: color }]} />
        ),
      };
    });

    // Adaptive sections: use more divisions for very large ranges
    const chartRange = max - min;
    const sections = chartRange > 1000 ? 5 : 4;

    return { lineData: points, refLow: rLow, refHigh: rHigh, minVal: min, maxVal: max, unit: u, sections };
  }, [history]);

  if (history.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No data for {testName}</Text>
      </View>
    );
  }

  const latest = history[history.length - 1];
  const previous = history.length >= 2 ? history[history.length - 2] : null;
  const change = previous ? latest.value - previous.value : null;
  const pctChange = change != null && previous ? (change / previous.value) * 100 : null;

  // Reference range strip data for shaded band
  const hasRefRange = refLow != null && refHigh != null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{testName}</Text>

      {/* Current value */}
      <View style={styles.currentRow}>
        <Text style={styles.currentValue}>
          {latest.value} <Text style={styles.currentUnit}>{unit}</Text>
        </Text>
        {change != null && (
          <Text style={[styles.change, change > 0 ? styles.changeUp : styles.changeDown]}>
            {change > 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)} ({Math.abs(pctChange!).toFixed(1)}%)
          </Text>
        )}
      </View>

      {/* Reference range label */}
      {hasRefRange && (
        <View style={styles.refRow}>
          <View style={styles.refDot} />
          <Text style={styles.refLabel}>
            Normal: {refLow} – {refHigh} {unit}
          </Text>
        </View>
      )}

      {/* Chart */}
      <View style={styles.chartContainer}>
        <LineChart
          data={lineData}
          width={chartWidth}
          height={160}
          spacing={Math.max(30, chartWidth / Math.max(lineData.length, 1))}
          color={Colors.purple}
          thickness={2}
          maxValue={maxVal}
          yAxisOffset={minVal}
          noOfSections={sections}
          yAxisTextStyle={chartLabelStyle}
          xAxisLabelTextStyle={chartLabelStyle}
          rulesColor={Colors.tabBarBorder}
          rulesType="dashed"
          curved
          dataPointsRadius={4}
          isAnimated={false}
          disableScroll
          initialSpacing={12}
          endSpacing={12}
          showStripOnFocus
          stripColor="rgba(124, 77, 255, 0.1)"
          stripWidth={2}
          focusedDataPointColor={Colors.purple}
          focusedDataPointRadius={6}
          showTextOnFocus
          textColor={Colors.textPrimary}
          textFontSize={10}
          textShiftX={-10}
          textShiftY={-10}
          // Reference range as horizontal rules
          showReferenceLine1={refLow != null}
          referenceLine1Position={refLow ?? 0}
          referenceLine1Config={{
            color: Colors.success,
            dashWidth: 4,
            dashGap: 4,
            thickness: 1,
          }}
          showReferenceLine2={refHigh != null}
          referenceLine2Position={refHigh ?? 0}
          referenceLine2Config={{
            color: Colors.success,
            dashWidth: 4,
            dashGap: 4,
            thickness: 1,
          }}
        />
      </View>

      {/* History list */}
      <View style={styles.historyList}>
        {[...history].reverse().map((h) => {
          const status = computeLabStatus(h.value, refLow, refHigh);
          const statusColor =
            status === 'high' || status === 'low'
              ? Colors.error
              : status === 'borderline'
                ? Colors.warning
                : Colors.success;

          return (
            <View key={h.id} style={styles.historyRow}>
              <View style={[styles.historyDot, { backgroundColor: statusColor }]} />
              <Text style={styles.historyDate}>
                {format(new Date(h.test_date + 'T00:00:00'), 'MMM d, yyyy')}
              </Text>
              <Text style={[styles.historyValue, { color: statusColor }]}>
                {h.value} {h.unit}
              </Text>
              {h.provider && <Text style={styles.historyProvider}>{h.provider}</Text>}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const pointStyles = StyleSheet.create({
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.cardBackground,
  },
});

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  title: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.purple,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  currentRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.md,
  },
  currentValue: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXl,
    color: Colors.textPrimary,
  },
  currentUnit: {
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
  },
  change: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
  },
  changeUp: {
    color: Colors.error,
  },
  changeDown: {
    color: Colors.success,
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  refDot: {
    width: 10,
    height: 3,
    backgroundColor: Colors.success,
    borderRadius: 1,
  },
  refLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
  },
  chartContainer: {
    marginTop: Spacing.sm,
  },
  historyList: {
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingLeft: Spacing.xs,
    borderLeftWidth: 2,
    borderLeftColor: Colors.tabBarBorder,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 2,
  },
  historyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  historyDate: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    width: 90,
  },
  historyValue: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
  },
  historyProvider: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    flex: 1,
    textAlign: 'right',
  },
});
