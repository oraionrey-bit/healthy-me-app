import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { Meridiem, TwelveHourTime } from '../../utils/zepbound-time';
import { BorderRadius, Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';

interface Props {
  label: string;
  value: TwelveHourTime;
  onChange: (value: TwelveHourTime) => void;
}

/** Accessible 12-hour Pacific time entry shared by shots and symptoms. */
export function ZepboundTimeInput({ label, value, onChange }: Props) {
  const updatePeriod = (period: Meridiem) => onChange({ ...value, period });

  return (
    <View>
      <Text style={styles.label}>Time (Pacific)</Text>
      <View style={styles.row}>
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Hour</Text>
          <TextInput
            accessibilityLabel={`${label} hour`}
            inputMode="numeric"
            keyboardType="number-pad"
            maxLength={2}
            placeholder="1–12"
            placeholderTextColor={Colors.textMuted}
            style={styles.input}
            value={value.hour}
            onChangeText={(hour) => onChange({ ...value, hour })}
          />
        </View>
        <Text style={styles.colon}>:</Text>
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Minute</Text>
          <TextInput
            accessibilityLabel={`${label} minute`}
            inputMode="numeric"
            keyboardType="number-pad"
            maxLength={2}
            placeholder="00–59"
            placeholderTextColor={Colors.textMuted}
            style={styles.input}
            value={value.minute}
            onChangeText={(minute) => onChange({ ...value, minute })}
          />
        </View>
        <View accessibilityRole="radiogroup" aria-label={`${label} AM or PM`} style={styles.periodWrap}>
          {(['AM', 'PM'] as const).map((period) => (
            <TouchableOpacity
              accessibilityRole="radio"
              accessibilityLabel={`${label} ${period}`}
              accessibilityState={{ checked: value.period === period }}
              aria-checked={value.period === period}
              key={period}
              onPress={() => updatePeriod(period)}
              style={[styles.periodButton, value.period === period && styles.periodButtonActive]}
            >
              <Text style={[styles.periodText, value.period === period && styles.periodTextActive]}>{period}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <Text style={styles.helper}>PST/PDT is handled automatically.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: Fonts.body, fontSize: FontSizes.bodySm, color: Colors.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.xs },
  fieldWrap: { width: 66 },
  fieldLabel: { fontFamily: Fonts.body, fontSize: FontSizes.bodyXs, color: Colors.textMuted, marginBottom: 2 },
  input: { borderWidth: 1, borderColor: Colors.tabBarBorder, borderRadius: BorderRadius.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xs, fontFamily: Fonts.body, fontSize: FontSizes.bodySm, color: Colors.textPrimary, textAlign: 'center' },
  colon: { fontFamily: Fonts.body, fontSize: FontSizes.bodyLg, color: Colors.textPrimary, paddingBottom: Spacing.sm },
  periodWrap: { flexDirection: 'row', borderWidth: 1, borderColor: Colors.tabBarBorder, borderRadius: BorderRadius.md, overflow: 'hidden', marginLeft: Spacing.xs },
  periodButton: { minWidth: 46, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xs, alignItems: 'center' },
  periodButtonActive: { backgroundColor: Colors.softPurple },
  periodText: { fontFamily: Fonts.body, fontSize: FontSizes.bodySm, color: Colors.textSecondary },
  periodTextActive: { color: Colors.purple },
  helper: { fontFamily: Fonts.body, fontSize: FontSizes.bodyXs, color: Colors.textMuted, marginTop: Spacing.xs },
});
