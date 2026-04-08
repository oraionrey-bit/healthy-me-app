import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { PixelButton } from '../ui';
import { useWeight } from '../../hooks/use-weight';
import { useUserProfile } from '../../hooks/use-user-profile';

export function WeightEntry() {
  const { todayWeight, loading, logWeight } = useWeight();
  const { profile } = useUserProfile();
  const unit = profile?.weight_unit ?? 'lbs';

  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  // Pre-fill with today's weight if already logged
  useEffect(() => {
    if (todayWeight) {
      setValue(String(todayWeight.weight));
    }
  }, [todayWeight]);

  const handleLog = async () => {
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed <= 0) return;

    setSaving(true);
    try {
      await logWeight(parsed);
    } finally {
      setSaving(false);
    }
  };

  const parsed = parseFloat(value);
  const isValid = !isNaN(parsed) && parsed > 0;

  return (
    <View style={styles.row}>
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={setValue}
          placeholder={loading ? '...' : 'Enter weight'}
          placeholderTextColor={Colors.textMuted}
          keyboardType="decimal-pad"
          returnKeyType="done"
          editable={!loading}
        />
        <Text style={styles.unit}>{unit}</Text>
      </View>
      <PixelButton
        title={todayWeight ? 'Update' : 'Log'}
        onPress={handleLog}
        variant="primary"
        loading={saving}
        disabled={saving || !isValid}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  inputWrap: {
    flex: 1,
    minWidth: 150,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    paddingHorizontal: Spacing.md,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    paddingVertical: Spacing.sm + 2,
  },
  unit: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
});
