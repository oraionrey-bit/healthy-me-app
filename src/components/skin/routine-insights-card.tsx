import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { PixelCard } from '../ui';

interface RoutineInsightsProps {
  amAdherence: number;
  pmAdherence: number;
  streak: number;
  mostSkippedStep: string | null;
}

function getBarColor(pct: number): string {
  if (pct >= 80) return Colors.success;
  if (pct >= 50) return Colors.warning;
  return Colors.error;
}

function AdherenceBar({ label, percentage }: { label: string; percentage: number }) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const color = getBarColor(clamped);

  return (
    <View style={styles.barContainer}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${clamped}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.barPct, { color }]}>{Math.round(clamped)}%</Text>
    </View>
  );
}

export function RoutineInsightsCard({
  amAdherence,
  pmAdherence,
  streak,
  mostSkippedStep,
}: RoutineInsightsProps) {
  return (
    <PixelCard>
      <Text style={styles.title}>{'📊 How It\u2019s Going'}</Text>

      <View style={styles.barsSection}>
        <AdherenceBar label="☀️ AM" percentage={amAdherence} />
        <AdherenceBar label="🌙 PM" percentage={pmAdherence} />
      </View>

      <Text style={styles.streakText}>
        {streak > 0 ? `🔥 ${streak} day streak` : 'No streak yet'}
      </Text>

      {mostSkippedStep != null && (
        <Text style={styles.skippedText}>Most skipped: {mostSkippedStep}</Text>
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
  barsSection: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  barLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    width: 48,
  },
  barTrack: {
    flex: 1,
    height: 12,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  barPct: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    width: 36,
    textAlign: 'right',
  },
  streakText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  skippedText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
  },
});
