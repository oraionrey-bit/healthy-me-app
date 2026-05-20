/**
 * EmojiPicker — row of emoji options with selection ring.
 *
 * Extracted from src/app/(tabs)/index.tsx during the May 7 split
 * (bundle module 1198, line 98212).
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';

interface EmojiOption {
  value: number;
  emoji: string;
}

interface EmojiPickerProps {
  options: EmojiOption[];
  selected: number | null;
  onSelect: (value: number) => void;
}

export const EmojiPicker = React.memo(function EmojiPicker({
  options,
  selected,
  onSelect,
}: EmojiPickerProps) {
  return (
    <View style={styles.emojiRow}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          onPress={() => onSelect(opt.value)}
          style={[
            styles.emojiButton,
            selected === opt.value && styles.emojiButtonSelected,
          ]}
          activeOpacity={0.7}
        >
          <Text style={styles.emojiText}>{opt.emoji}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  emojiRow: { flexDirection: 'row', gap: Spacing.sm },
  emojiButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiButtonSelected: {
    borderColor: Colors.purple,
    backgroundColor: Colors.softPurple,
  },
  emojiText: { fontSize: 24 },
});
