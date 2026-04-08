import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { PixelCard } from '../ui';

interface CalorieBalanceCardProps {
  calories: number;
  calorieTarget: number;
  protein: number;
  proteinTarget: number;
}

function ProgressRow({
  label,
  current,
  target,
  unit,
  fillColor,
}: {
  label: string;
  current: number;
  target: number;
  unit: string;
  fillColor: string;
}) {
  const percent = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const isOver = current > target;

  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            {
              width: `${percent}%`,
              backgroundColor: isOver ? Colors.warning : fillColor,
            },
          ]}
        />
      </View>
      <Text style={[styles.rowValue, isOver && styles.rowValueOver]}>
        {Math.round(current)}/{target}
        {unit}
      </Text>
    </View>
  );
}

export function CalorieBalanceCard({
  calories,
  calorieTarget,
  protein,
  proteinTarget,
}: CalorieBalanceCardProps) {
  const hasData = calories > 0 || protein > 0;

  return (
    <PixelCard>
      <Text style={styles.title}>Calorie Balance</Text>

      {hasData ? (
        <View style={styles.bars}>
          <ProgressRow
            label="Calories"
            current={calories}
            target={calorieTarget}
            unit=""
            fillColor={Colors.purple}
          />
          <ProgressRow
            label="Protein"
            current={protein}
            target={proteinTarget}
            unit="g"
            fillColor={Colors.babyBlue}
          />
        </View>
      ) : (
        <Text style={styles.emptyText}>No food logged yet today</Text>
      )}
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
  bars: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rowLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    width: 56,
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#F0EAF8',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  rowValue: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
    minWidth: 60,
    textAlign: 'right',
  },
  rowValueOver: {
    color: Colors.warning,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
  },
});
