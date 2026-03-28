import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, Shadows, BorderRadius } from '../../constants/theme';

interface AskOraionFABProps {
  onPress: () => void;
}

export function AskOraionFAB({ onPress }: AskOraionFABProps) {
  return (
    <TouchableOpacity style={styles.fab} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.emoji}>📸</Text>
      <Text style={styles.label}>Ask Oraion</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.purple,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    ...Shadows.card,
    zIndex: 100,
  },
  emoji: {
    fontSize: 18,
    marginRight: Spacing.xs + 2,
  },
  label: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textOnDark,
  },
});
