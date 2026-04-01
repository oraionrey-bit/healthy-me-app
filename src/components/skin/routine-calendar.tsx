import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { PixelCard } from '../ui';
import { MonthlyCalendar } from '../shared/monthly-calendar';
import type { Phase, RoutineStep } from '../../types/skin-plan';
import { isProductScheduled } from '../../types/skin-plan';

interface RoutineCalendarProps {
  activePhase: Phase;
}

export function RoutineCalendar({ activePhase }: RoutineCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [tooltipRoutine, setTooltipRoutine] = useState<{ am: RoutineStep[]; pm: RoutineStep[] } | null>(null);

  // Find every-other-day products to show dots
  const eodProducts = useMemo(() => {
    const all = [...activePhase.amRoutine, ...activePhase.pmRoutine];
    return all.filter((s) => s.frequency === 'every-other-day');
  }, [activePhase]);

  const getRoutineForDate = useCallback(
    (dateKey: string) => {
      const date = new Date(dateKey + 'T12:00:00');
      return {
        am: activePhase.amRoutine.filter((s) => isProductScheduled(s, date, activePhase.startDate)),
        pm: activePhase.pmRoutine.filter((s) => isProductScheduled(s, date, activePhase.startDate)),
      };
    },
    [activePhase],
  );

  const handleDayPress = useCallback(
    (dateKey: string) => {
      setSelectedDay(dateKey);
      setTooltipRoutine(getRoutineForDate(dateKey));
    },
    [getRoutineForDate],
  );

  const renderDay = useCallback(
    (date: Date, _dateKey: string) => {
      const hasEod = eodProducts.some((s) => isProductScheduled(s, date, activePhase.startDate));
      if (!hasEod) return null;
      return (
        <View style={styles.dotContainer}>
          <View style={styles.purpleDot} />
        </View>
      );
    },
    [eodProducts, activePhase.startDate],
  );

  // Build legend
  const legendItems = useMemo(() => {
    const names = eodProducts.map((s) => s.product.name);
    const unique = [...new Set(names)];
    return unique;
  }, [eodProducts]);

  return (
    <PixelCard>
      <Text style={styles.title}>📅 Routine Calendar</Text>
      <MonthlyCalendar
        currentMonth={currentMonth}
        onMonthChange={setCurrentMonth}
        onDayPress={handleDayPress}
        selectedDate={selectedDay ?? undefined}
        renderDay={renderDay}
        disableFuture={false}
      />

      {/* Legend */}
      {legendItems.length > 0 && (
        <View style={styles.legend}>
          {legendItems.map((name) => (
            <View key={name} style={styles.legendRow}>
              <View style={styles.purpleDot} />
              <Text style={styles.legendText}>{name} night</Text>
            </View>
          ))}
        </View>
      )}

      {/* Day detail modal */}
      <Modal visible={!!tooltipRoutine} transparent animationType="fade" onRequestClose={() => setTooltipRoutine(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setTooltipRoutine(null)}>
          <View style={styles.tooltip}>
            <Text style={styles.tooltipTitle}>
              {selectedDay
                ? new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })
                : ''}
            </Text>

            {tooltipRoutine && tooltipRoutine.am.length > 0 && (
              <View style={styles.tooltipSection}>
                <Text style={styles.tooltipSectionTitle}>☀️ AM</Text>
                {tooltipRoutine.am.map((s) => (
                  <Text key={s.id} style={styles.tooltipItem}>
                    • {s.product.name}
                  </Text>
                ))}
              </View>
            )}

            {tooltipRoutine && tooltipRoutine.pm.length > 0 && (
              <View style={styles.tooltipSection}>
                <Text style={styles.tooltipSectionTitle}>🌙 PM</Text>
                {tooltipRoutine.pm.map((s) => (
                  <Text key={s.id} style={styles.tooltipItem}>
                    • {s.product.name}
                    {s.isNew ? ' ✨' : ''}
                  </Text>
                ))}
              </View>
            )}

            {tooltipRoutine && tooltipRoutine.am.length === 0 && tooltipRoutine.pm.length === 0 && (
              <Text style={styles.tooltipEmpty}>No routine scheduled</Text>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </PixelCard>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  dotContainer: {
    alignItems: 'center',
    marginTop: 2,
  },
  purpleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.purple,
  },
  legend: {
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  legendText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  tooltip: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 320,
  },
  tooltipTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  tooltipSection: {
    marginBottom: Spacing.sm,
  },
  tooltipSectionTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  tooltipItem: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
    marginBottom: 2,
  },
  tooltipEmpty: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
