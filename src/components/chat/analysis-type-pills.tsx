import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { ANALYSIS_TYPES } from '../../constants/chat';
import type { ChatMessageType } from '../../types/database';

interface AnalysisTypePillsProps {
  selected: ChatMessageType;
  onSelect: (type: ChatMessageType) => void;
}

export function AnalysisTypePills({ selected, onSelect }: AnalysisTypePillsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
      <View style={styles.container}>
        {ANALYSIS_TYPES.map((type) => (
          <TouchableOpacity
            key={type.key}
            style={[styles.pill, selected === type.key && styles.pillSelected]}
            onPress={() => onSelect(type.key)}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{type.emoji}</Text>
            <Text style={[styles.label, selected === type.key && styles.labelSelected]}>
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  container: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.softPurple,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  pillSelected: {
    backgroundColor: Colors.purple,
    borderColor: Colors.lavender,
  },
  emoji: {
    fontSize: 14,
    marginRight: Spacing.xs,
  },
  label: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.purple,
  },
  labelSelected: {
    color: Colors.textOnDark,
  },
});
