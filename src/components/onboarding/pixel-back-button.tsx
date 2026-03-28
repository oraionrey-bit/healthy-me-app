import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../../constants/theme';

export function PixelBackButton() {
  return (
    <TouchableOpacity
      onPress={() => router.back()}
      style={styles.btn}
      activeOpacity={0.7}
    >
      <Text style={styles.arrow}>◀</Text>
      <Text style={styles.label}>Back</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.lavender,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
    ...Shadows.soft,
  },
  arrow: {
    fontFamily: Fonts.pixel,
    fontSize: FontSizes.xs,
    color: Colors.purple,
  },
  label: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.purple,
  },
});
