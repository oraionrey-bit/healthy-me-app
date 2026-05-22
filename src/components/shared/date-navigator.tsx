/**
 * DateNavigator — back/forward arrows + tap-to-today.
 *
 * Restored from the May 7 production bundle (module 1195).
 *
 * Notes:
 *  - Right arrow is disabled (and grayed) when isToday is true.
 *  - Date renders as "weekday, Month d" (e.g., "Tuesday, May 20").
 *  - Below the date, when !isToday, shows a small purple "tap to return to today" hint.
 *    The whole date text is tappable (calls onTapDate which should jump to today).
 *  - Exported helper: formatDisplayDate (also exported by the bundle module).
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  Colors,
  Fonts,
  FontSizes,
  Spacing,
  BorderRadius,
} from '../../constants/theme';

export function formatDisplayDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

interface DateNavigatorProps {
  selectedDate: Date;
  isToday: boolean;
  onBack: () => void;
  onForward: () => void;
  onTapDate: () => void;
}

export const DateNavigator = React.memo(function DateNavigator({
  selectedDate,
  isToday,
  onBack,
  onForward,
  onTapDate,
}: DateNavigatorProps) {
  return (
    <View style={styles.dateNav}>
      <TouchableOpacity
        onPress={onBack}
        style={styles.navArrow}
        activeOpacity={0.7}
      >
        <Text style={styles.navArrowText}>◀</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onTapDate}
        activeOpacity={0.7}
        style={styles.dateTextWrap}
      >
        <Text style={styles.date}>{formatDisplayDate(selectedDate)}</Text>
        {!isToday && (
          <Text style={styles.backToTodayText}>tap to return to today</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onForward}
        style={[styles.navArrow, isToday && styles.navArrowDisabled]}
        disabled={isToday}
        activeOpacity={0.7}
      >
        <Text style={[styles.navArrowText, isToday && styles.navArrowTextDisabled]}>
          ▶
        </Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  navArrow: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrowDisabled: { opacity: 0.3 },
  navArrowText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.purple,
  },
  navArrowTextDisabled: { color: Colors.textMuted },
  dateTextWrap: { alignItems: 'center', minWidth: 200 },
  date: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  backToTodayText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.purple,
    marginTop: -Spacing.xs,
    marginBottom: Spacing.xs,
  },
});
