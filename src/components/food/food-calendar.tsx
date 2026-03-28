import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MonthlyCalendar } from '../shared/monthly-calendar';
import { Colors } from '../../constants/theme';
import type { DaySummary } from '../../hooks/use-food-calendar';

interface FoodCalendarProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  summaries: Map<string, DaySummary>;
  selectedDate?: string;
  onDaySelect: (dateKey: string) => void;
}

export function FoodCalendar({
  currentMonth,
  onMonthChange,
  summaries,
  selectedDate,
  onDaySelect,
}: FoodCalendarProps) {
  const renderDay = (_date: Date, dateKey: string) => {
    const summary = summaries.get(dateKey);
    if (!summary || summary.mealCount === 0) return null;

    // Purple dot: ≥3 meals logged. Baby blue: 1-2 meals.
    const color = summary.mealCount >= 3 ? Colors.purple : Colors.babyBlue;

    return <View style={[styles.dot, { backgroundColor: color }]} />;
  };

  return (
    <MonthlyCalendar
      currentMonth={currentMonth}
      onMonthChange={onMonthChange}
      renderDay={renderDay}
      onDayPress={onDaySelect}
      selectedDate={selectedDate}
      disableFuture
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
});
