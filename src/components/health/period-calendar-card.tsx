import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { HealthCard, EmptyState } from './health-card';
import { MonthlyCalendar } from '../shared/monthly-calendar';
import { PeriodLogModal } from './period-log-modal';
import type { PeriodLog } from '../../types/database';
import type { FlowLevel } from '../../types/database';
import type { PeriodLogInput } from '../../hooks/use-period-calendar';

interface Props {
  periodLogs: Map<string, PeriodLog>;
  currentMonth: Date;
  selectedDate: string | null;
  saving: boolean;
  onMonthChange: (d: Date) => void;
  onDayPress: (dateKey: string) => void;
  onSave: (dateKey: string, input: PeriodLogInput) => Promise<void>;
  onDelete: (dateKey: string) => Promise<void>;
}

const FLOW_COLORS: Record<FlowLevel, { bg: string; dot: string }> = {
  heavy: { bg: 'rgba(229, 115, 115, 0.25)', dot: '#e57373' },
  medium: { bg: 'rgba(255, 183, 77, 0.2)', dot: '#ffb74d' },
  light: { bg: 'rgba(255, 241, 118, 0.25)', dot: '#fff176' },
  spotting: { bg: 'rgba(224, 224, 224, 0.3)', dot: '#e0e0e0' },
};

const DOT_SIZES: Record<FlowLevel, number> = {
  heavy: 8,
  medium: 6,
  light: 5,
  spotting: 4,
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
  selectedDate,
  saving,
  onMonthChange,
  onDayPress,
  onSave,
  onDelete,
}: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDateKey, setModalDateKey] = useState<string | null>(null);

  const handleDayPress = useCallback(
    (dateKey: string) => {
      onDayPress(dateKey);
      setModalDateKey(dateKey);
      setModalVisible(true);
    },
    [onDayPress]
  );

  const handleModalClose = useCallback(() => {
    setModalVisible(false);
    setModalDateKey(null);
  }, []);

  const renderDay = useCallback(
    (_date: Date, dateKey: string) => {
      const log = periodLogs.get(dateKey);
      if (!log?.flow) {
        // Show symptom-only indicator (cramps/headache/back pain without flow)
        if (log && (log.cramps > 0 || log.headache || log.back_pain)) {
          return (
            <View style={styles.symptomOnlyDot} />
          );
        }
        return null;
      }
      const dotSize = DOT_SIZES[log.flow];
      const colors = FLOW_COLORS[log.flow];
      const hasSymptoms = log.cramps > 0 || log.headache || log.back_pain;
      return (
        <View style={styles.dayIndicator}>
          <View
            style={[
              styles.dot,
              {
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: colors.dot,
              },
            ]}
          />
          {hasSymptoms && <View style={styles.symptomTick} />}
        </View>
      );
    },
    [periodLogs]
  );

  const existingLog = modalDateKey ? periodLogs.get(modalDateKey) ?? null : null;

  // Summary stats
  const periodDays = Array.from(periodLogs.values()).filter((l) => l.flow).length;
  const crampDays = Array.from(periodLogs.values()).filter((l) => l.cramps > 0).length;

  return (
    <HealthCard title="Period Tracker" borderColor={Colors.softPink}>
      {periodLogs.size === 0 ? (
        <EmptyState message="Tap a day to start tracking your period" />
      ) : (
        <View style={styles.statsRow}>
          <Text style={styles.statText}>
            {periodDays} period {periodDays === 1 ? 'day' : 'days'}
          </Text>
          {crampDays > 0 && (
            <Text style={styles.statText}>
              {crampDays} {crampDays === 1 ? 'day' : 'days'} w/ cramps
            </Text>
          )}
        </View>
      )}
      <MonthlyCalendar
        currentMonth={currentMonth}
        onMonthChange={onMonthChange}
        renderDay={renderDay}
        onDayPress={handleDayPress}
        selectedDate={selectedDate ?? undefined}
        disableFuture
      />
      <View style={styles.legend}>
        {LEGEND_ITEMS.map(({ flow, label }) => {
          const dotSize = DOT_SIZES[flow];
          return (
            <View key={flow} style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  {
                    width: dotSize,
                    height: dotSize,
                    borderRadius: dotSize / 2,
                    backgroundColor: FLOW_COLORS[flow].dot,
                  },
                ]}
              />
              <Text style={styles.legendText}>{label}</Text>
            </View>
          );
        })}
      </View>
      <PeriodLogModal
        visible={modalVisible}
        dateKey={modalDateKey}
        existingLog={existingLog}
        saving={saving}
        onSave={onSave}
        onDelete={onDelete}
        onClose={handleModalClose}
      />
    </HealthCard>
  );
});

const styles = StyleSheet.create({
  dayIndicator: {
    alignItems: 'center',
    marginTop: 2,
  },
  dot: {
    alignSelf: 'center',
  },
  symptomTick: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.warning,
    marginTop: 1,
  },
  symptomOnlyDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.lavender,
    alignSelf: 'center',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  statText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
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
