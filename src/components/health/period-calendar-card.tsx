import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { HealthCard, EmptyState } from './health-card';
import { MonthlyCalendar } from '../shared/monthly-calendar';
import type { PeriodLog } from '../../types/database';
import type { FlowLevel } from '../../types/database';

interface Props {
  periodLogs: Map<string, PeriodLog>;
  currentMonth: Date;
  onMonthChange: (d: Date) => void;
}

const FLOW_CONFIG: Record<FlowLevel, { color: string; size: number }> = {
  heavy: { color: '#e57373', size: 8 },
  medium: { color: '#ffb74d', size: 6 },
  light: { color: '#fff176', size: 5 },
  spotting: { color: '#e0e0e0', size: 4 },
};

const LEGEND_ITEMS: { flow: FlowLevel; label: string }[] = [
  { flow: 'heavy', label: 'Heavy' },
  { flow: 'medium', label: 'Medium' },
  { flow: 'light', label: 'Light' },
  { flow: 'spotting', label: 'Spotting' },
];

export const PeriodCalendarCard = React.memo(function PeriodCalendarCard({
  periodLogs,
  currentMonth,
  onMonthChange,
}: Props) {
  const renderDay = useCallback(
    (_date: Date, dateKey: string) => {
      const log = periodLogs.get(dateKey);
      if (!log?.flow) return null;
      const config = FLOW_CONFIG[log.flow];
      return (
        <View
          style={[
            styles.dot,
            {
              width: config.size,
              height: config.size,
              borderRadius: config.size / 2,
              backgroundColor: config.color,
            },
          ]}
        />
      );
    },
    [periodLogs]
  );

  // no-op for day press since this is view-only
  const handleDayPress = useCallback(() => {}, []);

  return (
    <HealthCard title="🩸 Period Tracker" borderColor={Colors.softPink}>
      {periodLogs.size === 0 ? (
        <EmptyState message="Tap a day to start tracking your period 🩸" />
      ) : null}
      <MonthlyCalendar
        currentMonth={currentMonth}
        onMonthChange={onMonthChange}
        renderDay={renderDay}
        onDayPress={handleDayPress}
        disableFuture
      />
      <View style={styles.legend}>
        {LEGEND_ITEMS.map(({ flow, label }) => (
          <View key={flow} style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                {
                  width: FLOW_CONFIG[flow].size,
                  height: FLOW_CONFIG[flow].size,
                  borderRadius: FLOW_CONFIG[flow].size / 2,
                  backgroundColor: FLOW_CONFIG[flow].color,
                },
              ]}
            />
            <Text style={styles.legendText}>{label}</Text>
          </View>
        ))}
      </View>
    </HealthCard>
  );
});

const styles = StyleSheet.create({
  dot: {
    alignSelf: 'center',
    marginTop: 2,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {},
  legendText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
  },
});
