import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { HealthCard, EmptyState } from './health-card';
import { useChartWidth } from './use-chart-width';
import { aggregateWeekly, chartLabelStyle } from '../../utils/chart-helpers';
import type { MoodEnergyPoint, TimeRange } from '../../hooks/use-health-trends';
import { format, parseISO } from 'date-fns';

interface Props {
  data: MoodEnergyPoint[];
  range: TimeRange;
}

function aggregateMoodEnergyWeekly(points: MoodEnergyPoint[]): MoodEnergyPoint[] {
  return aggregateWeekly(points, (week) => {
    const moods = week.filter((p) => p.mood != null).map((p) => p.mood!);
    const energies = week.filter((p) => p.energy != null).map((p) => p.energy!);
    return {
      date: week[0].date,
      mood: moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : null,
      energy: energies.length ? energies.reduce((a, b) => a + b, 0) / energies.length : null,
    };
  });
}

export const MoodEnergyTrend = React.memo(function MoodEnergyTrend({ data, range }: Props) {
  const chartWidth = useChartWidth();

  const { moodData, energyData, avgMood, avgEnergy } = useMemo(() => {
    const points = range === '90d' ? aggregateMoodEnergyWeekly(data) : data;

    const moodVals = data.filter((p) => p.mood != null).map((p) => p.mood!);
    const energyVals = data.filter((p) => p.energy != null).map((p) => p.energy!);

    const labelInterval = Math.max(1, Math.floor(points.length / 6));

    return {
      moodData: points.map((p, i) => ({
        value: p.mood ?? 0,
        dataPointText: undefined as string | undefined,
        label: i % labelInterval === 0 ? format(parseISO(p.date), 'd') : '',
      })),
      energyData: points.map((p) => ({
        value: p.energy ?? 0,
      })),
      avgMood: moodVals.length ? (moodVals.reduce((a, b) => a + b, 0) / moodVals.length).toFixed(1) : '—',
      avgEnergy: energyVals.length ? (energyVals.reduce((a, b) => a + b, 0) / energyVals.length).toFixed(1) : '—',
    };
  }, [data, range]);

  return (
    <HealthCard title="😊 Mood & Energy" borderColor={Colors.pink}>
      {data.length === 0 ? (
        <EmptyState message="Start logging mood & energy on Home to see trends! 😊" />
      ) : (
        <>
          <LineChart
            data={moodData}
            data2={energyData}
            width={chartWidth}
            height={140}
            spacing={Math.max(20, chartWidth / Math.max(moodData.length, 1))}
            color1={Colors.purple}
            color2={Colors.babyBlue}
            dataPointsColor1={Colors.purple}
            dataPointsColor2={Colors.babyBlue}
            dataPointsRadius1={3}
            dataPointsRadius2={3}
            thickness={2}
            maxValue={5}
            noOfSections={4}
            yAxisTextStyle={chartLabelStyle}
            xAxisLabelTextStyle={chartLabelStyle}
            rulesColor={Colors.tabBarBorder}
            rulesType="dashed"
            curved
            hideDataPoints={moodData.length > 15}
            isAnimated={false}
            disableScroll
            initialSpacing={8}
            endSpacing={8}
          />
          <View style={styles.summaryRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.purple }]} />
              <Text style={styles.summaryText}>Mood: {avgMood}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.babyBlue }]} />
              <Text style={styles.summaryText}>Energy: {avgEnergy}</Text>
            </View>
          </View>
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
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
  },
});
