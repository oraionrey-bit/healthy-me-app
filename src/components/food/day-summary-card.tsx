import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PixelCard } from '../ui/pixel-card';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import type { DaySummary } from '../../hooks/use-food-calendar';
import type { FoodLog } from '../../types/database';

const MEAL_EMOJI: Record<FoodLog['meal_type'], string> = {
  breakfast: '🌅',
  lunch: '🌞',
  dinner: '🌆',
  snack: '🍿',
};

interface DaySummaryCardProps {
  summary: DaySummary;
  dateLabel: string;
  onViewFullDay: () => void;
}

export function DaySummaryCard({ summary, dateLabel, onViewFullDay }: DaySummaryCardProps) {
  const mealTypesList = Array.from(summary.mealTypes);

  return (
    <PixelCard style={styles.card}>
      <Text style={styles.dateHeader}>{dateLabel}</Text>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{summary.totalCalories}</Text>
          <Text style={styles.statLabel}>cal</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{summary.totalProtein}g</Text>
          <Text style={styles.statLabel}>protein</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{summary.mealCount}</Text>
          <Text style={styles.statLabel}>{summary.mealCount === 1 ? 'meal' : 'meals'}</Text>
        </View>
      </View>

      {mealTypesList.length > 0 && (
        <View style={styles.mealsRow}>
          {mealTypesList.map((type) => (
            <Text key={type} style={styles.mealChip}>
              {MEAL_EMOJI[type]} {type}
            </Text>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.viewBtn} onPress={onViewFullDay} activeOpacity={0.7}>
        <Text style={styles.viewBtnText}>View Full Day →</Text>
      </TouchableOpacity>
    </PixelCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.lg,
  },
  dateHeader: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.purple,
  },
  statLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.tabBarBorder,
  },
  mealsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  mealChip: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  viewBtn: {
    backgroundColor: Colors.purple,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  viewBtnText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textOnDark,
  },
});
