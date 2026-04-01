import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PixelCard } from '../ui/pixel-card';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useUserProfile } from '../../hooks/use-user-profile';
import type { FoodAnalysis } from '../../types/database';

interface FoodAnalysisCardProps {
  analysis: FoodAnalysis;
}

function MacroBar({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <View style={styles.macroRow}>
      <View style={[styles.macroDot, { backgroundColor: color }]} />
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroValue}>
        {value}
        {unit}
      </Text>
    </View>
  );
}

export function FoodAnalysisCard({ analysis }: FoodAnalysisCardProps) {
  const { isPcos } = useUserProfile();

  return (
    <PixelCard style={styles.card}>
      <Text style={styles.title}>🍽️ Nutrition Breakdown</Text>

      {analysis.items && analysis.items.length > 0 && (
        <Text style={styles.items}>{analysis.items.join(', ')}</Text>
      )}

      <View style={styles.macros}>
        {analysis.calories != null && (
          <MacroBar label="Calories" value={analysis.calories} unit=" kcal" color={Colors.warning} />
        )}
        {analysis.protein != null && (
          <MacroBar label="Protein" value={analysis.protein} unit="g" color={Colors.info} />
        )}
        {analysis.carbs != null && (
          <MacroBar label="Carbs" value={analysis.carbs} unit="g" color={Colors.lavender} />
        )}
        {analysis.fat != null && (
          <MacroBar label="Fat" value={analysis.fat} unit="g" color={Colors.peach} />
        )}
        {analysis.fiber != null && (
          <MacroBar label="Fiber" value={analysis.fiber} unit="g" color={Colors.mint} />
        )}
      </View>

      {analysis.pcos_notes && (
        <View style={styles.notesBox}>
          <Text style={styles.notesTitle}>{isPcos ? '💜 PCOS Notes' : '💚 Health Notes'}</Text>
          <Text style={styles.notesText}>{analysis.pcos_notes}</Text>
        </View>
      )}

      {analysis.confidence != null && (
        <Text style={styles.confidence}>
          Confidence: {Math.round(analysis.confidence * 100)}%
        </Text>
      )}
    </PixelCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: Spacing.sm,
  },
  title: {
    fontFamily: Fonts.pixel,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  items: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    fontStyle: 'italic',
  },
  macros: {
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  macroDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.xs,
  },
  macroLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    flex: 1,
  },
  macroValue: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  notesBox: {
    backgroundColor: Colors.softPurple,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },
  notesTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.purple,
    marginBottom: Spacing.xs,
    fontWeight: '600',
  },
  notesText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  confidence: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    textAlign: 'right',
  },
});
