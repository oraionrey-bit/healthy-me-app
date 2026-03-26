import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '../../constants/theme';

interface PixelCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'accent';
}

export function PixelCard({ children, style, variant = 'default' }: PixelCardProps) {
  return (
    <View style={[styles.card, variant === 'accent' && styles.accent, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  accent: {
    backgroundColor: Colors.softPurple,
    borderColor: Colors.lavender,
  },
});
