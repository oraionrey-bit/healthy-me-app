import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../../constants/theme';

interface HealthCardProps {
  title: string;
  borderColor: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

/** Shared card wrapper for all health dashboard cards. */
export function HealthCard({ title, borderColor, children, style }: HealthCardProps) {
  return (
    <View style={[styles.card, { borderLeftColor: borderColor }, style]}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  title: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyContainer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
