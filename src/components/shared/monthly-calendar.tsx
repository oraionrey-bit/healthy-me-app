import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isAfter,
  format,
  addMonths,
  subMonths,
} from 'date-fns';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { toDateKey } from '../../utils/storage';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

interface MonthlyCalendarProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  renderDay?: (date: Date, dateKey: string) => React.ReactNode;
  onDayPress: (dateKey: string) => void;
  selectedDate?: string;
  disableFuture?: boolean;
}

export function MonthlyCalendar({
  currentMonth,
  onMonthChange,
  renderDay,
  onDayPress,
  selectedDate,
  disableFuture = true,
}: MonthlyCalendarProps) {
  const today = useMemo(() => new Date(), []);

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const canGoForward = disableFuture
    ? !isSameMonth(currentMonth, today) && !isAfter(startOfMonth(addMonths(currentMonth, 1)), today)
    : true;

  return (
    <View style={styles.container}>
      {/* Month header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => onMonthChange(subMonths(currentMonth, 1))}
          style={styles.navBtn}
        >
          <Text style={styles.navText}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{format(currentMonth, 'MMMM yyyy')}</Text>
        <TouchableOpacity
          onPress={() => onMonthChange(addMonths(currentMonth, 1))}
          style={[styles.navBtn, !canGoForward && styles.navDisabled]}
          disabled={!canGoForward}
        >
          <Text style={[styles.navText, !canGoForward && styles.navTextDisabled]}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* Weekday row */}
      <View style={styles.weekRow}>
        {WEEKDAYS.map((d) => (
          <View key={d} style={styles.weekCell}>
            <Text style={styles.weekText}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Day grid */}
      <View style={styles.grid}>
        {days.map((day) => {
          const dateKey = toDateKey(day);
          const inMonth = isSameMonth(day, currentMonth);
          const isSelected = selectedDate === dateKey;
          const isToday = isSameDay(day, today);
          const isFuture = disableFuture && isAfter(day, today);
          const disabled = !inMonth || isFuture;

          return (
            <TouchableOpacity
              key={dateKey}
              style={styles.dayCell}
              onPress={() => !disabled && onDayPress(dateKey)}
              disabled={disabled}
              activeOpacity={0.6}
            >
              <View
                style={[
                  styles.dayCircle,
                  isSelected && styles.daySelected,
                  isToday && !isSelected && styles.dayToday,
                ]}
              >
                <Text
                  style={[
                    styles.dayNum,
                    !inMonth && styles.dayNumHidden,
                    isFuture && styles.dayNumMuted,
                    isSelected && styles.dayNumSelected,
                  ]}
                >
                  {inMonth ? day.getDate() : ''}
                </Text>
              </View>
              {inMonth && renderDay ? renderDay(day, dateKey) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const CELL_SIZE = `${100 / 7}%` as const;

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navDisabled: { opacity: 0.3 },
  navText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.purple,
  },
  navTextDisabled: { color: Colors.textMuted },
  monthTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  weekCell: {
    width: CELL_SIZE,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  weekText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: CELL_SIZE,
    alignItems: 'center',
    paddingVertical: 4,
    minHeight: 40,
  },
  dayCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: {
    backgroundColor: Colors.purple,
  },
  dayToday: {
    borderWidth: 1.5,
    borderColor: Colors.babyBlue,
  },
  dayNum: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textPrimary,
  },
  dayNumHidden: { color: 'transparent' },
  dayNumMuted: { color: Colors.textMuted, opacity: 0.4 },
  dayNumSelected: { color: Colors.textOnDark },
});
