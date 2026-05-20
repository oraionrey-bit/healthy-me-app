import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { PixelButton } from '../ui';
import { useWeight } from '../../hooks/use-weight';
import { useUserProfile } from '../../hooks/use-user-profile';

/**
 * WeightEntry — per-day weight logging with delete-day support.
 *
 * Restored from May 7 bundle (lines 130405–130549). Adds:
 *  - Mini date nav above the input (◀ short-date ▶ + tap-to-return).
 *  - Button title toggles between "Log" / "Update".
 *  - "Delete this day's entry" link (red, underlined) when entry exists.
 */
export function WeightEntry() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const isToday =
    selectedDate.toDateString() === new Date().toDateString();

  const { entryForDay, loading, saveWeight, deleteWeight } = useWeight(selectedDate);
  const { profile } = useUserProfile();
  const unit = profile?.weight_unit ?? 'lbs';

  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  // Pre-fill with the day's entry whenever it changes (or clear when none).
  useEffect(() => {
    if (entryForDay) {
      setValue(String(entryForDay.weight));
    } else {
      setValue('');
    }
  }, [entryForDay]);

  const hasEntry = !!entryForDay;
  const parsed = parseFloat(value);
  const canSubmit = !isNaN(parsed) && parsed > 0;

  const handleSave = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      await saveWeight(parsed);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await deleteWeight();
      setValue('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      {/* Mini date nav */}
      <View style={styles.dateNav}>
        <TouchableOpacity
          onPress={() => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() - 1);
            setSelectedDate(d);
          }}
          style={styles.navArrow}
          activeOpacity={0.7}
        >
          <Text style={styles.navArrowText}>◀</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSelectedDate(new Date())}
          activeOpacity={0.7}
          style={styles.dateTextWrap}
        >
          <Text style={styles.dateText}>
            {isToday
              ? 'Today'
              : selectedDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
          </Text>
          {!isToday && <Text style={styles.backToTodayText}>tap to return</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            if (isToday) return;
            const d = new Date(selectedDate);
            d.setDate(d.getDate() + 1);
            setSelectedDate(d);
          }}
          style={[styles.navArrow, isToday && styles.navArrowDisabled]}
          disabled={isToday}
          activeOpacity={0.7}
        >
          <Text style={[styles.navArrowText, isToday && styles.navArrowTextDisabled]}>▶</Text>
        </TouchableOpacity>
      </View>

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
          title={hasEntry ? 'Update' : 'Log'}
          onPress={handleSave}
          variant="primary"
          loading={busy}
          disabled={busy || !canSubmit}
        />
      </View>

      {hasEntry && (
        <TouchableOpacity
          onPress={handleDelete}
          disabled={busy}
          style={styles.deleteRow}
        >
          <Text style={styles.deleteText}>Delete this day&apos;s entry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  navArrow: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrowDisabled: { opacity: 0.3 },
  navArrowText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.purple,
  },
  navArrowTextDisabled: { color: Colors.textMuted },
  dateTextWrap: { alignItems: 'center', minWidth: 140 },
  dateText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
  },
  backToTodayText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.purple,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.md,
  },
  inputWrap: {
    flex: 1,
    minWidth: 120,
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
  deleteRow: { alignSelf: 'flex-end', marginTop: Spacing.sm },
  deleteText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.error,
    textDecorationLine: 'underline',
  },
});
