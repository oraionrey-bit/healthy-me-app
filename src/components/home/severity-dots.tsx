/**
 * SeverityDots — 1..5 severity selector for a symptom row.
 *
 * Extracted from src/app/(tabs)/index.tsx during the May 7 split
 * (bundle module 1200, line 98315).
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';

interface SeverityDotsProps {
  severity: number;
  onSelect: (value: number) => void;
}

export const SeverityDots = React.memo(function SeverityDots({
  severity,
  onSelect,
}: SeverityDotsProps) {
  return (
    <View style={styles.severityRow}>
      {[1, 2, 3, 4, 5].map((v) => (
        <TouchableOpacity
          key={v}
          onPress={() => onSelect(v)}
          style={[styles.severityDot, v <= severity && styles.severityDotActive]}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.severityDotText,
              v <= severity && styles.severityDotTextActive,
            ]}
          >
            {v}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  severityRow: { flexDirection: 'row', gap: Spacing.xs },
  severityDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  severityDotActive: {
    backgroundColor: Colors.purple,
    borderColor: Colors.purple,
  },
  severityDotText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
  },
  severityDotTextActive: { color: Colors.textOnDark },
});
