import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import type { TimeRange } from '../../hooks/use-health-trends';

const RANGES: TimeRange[] = ['7d', '30d', '90d'];
const LABELS: Record<TimeRange, string> = { '7d': '7D', '30d': '30D', '90d': '90D' };

interface TimeRangeSelectorProps {
  range: TimeRange;
  onRangeChange: (r: TimeRange) => void;
}

export const TimeRangeSelector = React.memo(function TimeRangeSelector({
  range,
  onRangeChange,
}: TimeRangeSelectorProps) {
  return (
    <View style={styles.row}>
      {RANGES.map((r) => (
        <TouchableOpacity
          key={r}
          style={[styles.pill, r === range && styles.pillActive]}
          onPress={() => onRangeChange(r)}
          activeOpacity={0.7}
        >
          <Text style={[styles.pillText, r === range && styles.pillTextActive]}>
            {LABELS[r]}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
  },
  pillActive: {
    backgroundColor: Colors.purple,
    borderColor: Colors.purple,
  },
  pillText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textSecondary,
  },
  pillTextActive: {
    color: Colors.textOnDark,
  },
});
