/**
 * SymptomChip — pill toggle for a symptom on the Home check-in card.
 *
 * Extracted from src/app/(tabs)/index.tsx during the May 7 split
 * (bundle module 1199, line 98265).
 */
import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

interface SymptomChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

export const SymptomChip = React.memo(function SymptomChip({
  label,
  active,
  onPress,
}: SymptomChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  chip: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
  },
  chipActive: {
    backgroundColor: Colors.softPurple,
    borderColor: Colors.purple,
  },
  chipText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
  },
  chipTextActive: { color: Colors.purple },
});
