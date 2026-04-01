import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Alert,
} from 'react-native';
import { PixelCard, PixelButton } from '../ui';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useLabs } from '../../hooks/use-labs';
import { LAB_CATEGORIES, CATEGORY_ORDER, findTestDef, computeLabStatus } from '../../constants/lab-categories';
import type { LabTestDef } from '../../constants/lab-categories';
import type { AddLabInput } from '../../hooks/use-labs';
import { toDateKey } from '../../utils/storage';

interface BatchEntry {
  testName: string;
  value: string;
  unit: string;
  refLow: number | null;
  refHigh: number | null;
  category: string;
}

export function LabEntryForm({ onDone }: { onDone?: () => void }) {
  const { addLab, addLabsBatch } = useLabs();
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORY_ORDER[0]);
  const [testDate, setTestDate] = useState(toDateKey(new Date()));
  const [provider, setProvider] = useState('');
  const [notes, setNotes] = useState('');
  const [batchEntries, setBatchEntries] = useState<BatchEntry[]>([]);
  const [saving, setSaving] = useState(false);

  // Single entry state
  const [showTestPicker, setShowTestPicker] = useState(false);
  const [singleTest, setSingleTest] = useState<BatchEntry | null>(null);
  const [singleValue, setSingleValue] = useState('');

  const handleSelectTest = useCallback((test: LabTestDef, catKey: string) => {
    setSingleTest({
      testName: test.name,
      value: '',
      unit: test.unit,
      refLow: test.refLow,
      refHigh: test.refHigh,
      category: catKey,
    });
    setSingleValue('');
    setShowTestPicker(false);
  }, []);

  const handleAddToBatch = useCallback(() => {
    if (!singleTest || !singleValue.trim()) return;
    const val = parseFloat(singleValue);
    if (isNaN(val)) return;

    setBatchEntries((prev) => [
      ...prev.filter((e) => e.testName !== singleTest.testName),
      { ...singleTest, value: singleValue },
    ]);
    setSingleTest(null);
    setSingleValue('');
  }, [singleTest, singleValue]);

  const handleRemoveFromBatch = useCallback((testName: string) => {
    setBatchEntries((prev) => prev.filter((e) => e.testName !== testName));
  }, []);

  const handleSaveAll = useCallback(async () => {
    const entries: AddLabInput[] = [];

    // Add batch entries
    for (const entry of batchEntries) {
      const val = parseFloat(entry.value);
      if (isNaN(val)) continue;
      entries.push({
        testName: entry.testName,
        value: val,
        unit: entry.unit,
        testDate,
        refLow: entry.refLow,
        refHigh: entry.refHigh,
        category: entry.category,
        provider: provider.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    }

    // Add current single entry if filled
    if (singleTest && singleValue.trim()) {
      const val = parseFloat(singleValue);
      if (!isNaN(val)) {
        entries.push({
          testName: singleTest.testName,
          value: val,
          unit: singleTest.unit,
          testDate,
          refLow: singleTest.refLow,
          refHigh: singleTest.refHigh,
          category: singleTest.category,
          provider: provider.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      }
    }

    if (entries.length === 0) return;

    setSaving(true);
    try {
      await addLabsBatch(entries);
      setBatchEntries([]);
      setSingleTest(null);
      setSingleValue('');
      setNotes('');
      onDone?.();
    } catch {
      Alert.alert('Error', 'Failed to save lab results');
    } finally {
      setSaving(false);
    }
  }, [batchEntries, singleTest, singleValue, testDate, provider, notes, addLabsBatch, onDone]);

  const totalEntries = batchEntries.length + (singleTest && singleValue ? 1 : 0);

  const statusColor = (value: string, refLow: number | null, refHigh: number | null) => {
    const val = parseFloat(value);
    if (isNaN(val)) return Colors.textMuted;
    const s = computeLabStatus(val, refLow, refHigh);
    if (s === 'high' || s === 'low') return Colors.error;
    if (s === 'borderline') return Colors.warning;
    return Colors.success;
  };

  return (
    <View style={styles.container}>
      {/* Date + Provider */}
      <View style={styles.metaRow}>
        <View style={styles.metaField}>
          <Text style={styles.label}>Date</Text>
          <TextInput
            style={styles.input}
            value={testDate}
            onChangeText={setTestDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.textMuted}
          />
        </View>
        <View style={styles.metaField}>
          <Text style={styles.label}>Provider</Text>
          <TextInput
            style={styles.input}
            value={provider}
            onChangeText={setProvider}
            placeholder="e.g. One Medical"
            placeholderTextColor={Colors.textMuted}
          />
        </View>
      </View>

      {/* Category Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        {CATEGORY_ORDER.map((catKey) => {
          const cat = LAB_CATEGORIES[catKey];
          const isActive = activeCategory === catKey;
          return (
            <TouchableOpacity
              key={catKey}
              style={[styles.categoryTab, isActive && styles.categoryTabActive]}
              onPress={() => setActiveCategory(catKey)}
            >
              <Text style={[styles.categoryTabText, isActive && styles.categoryTabTextActive]}>
                {cat.emoji} {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Test Grid */}
      <View style={styles.testGrid}>
        {LAB_CATEGORIES[activeCategory].tests.map((test) => {
          const inBatch = batchEntries.find((e) => e.testName === test.name);
          const isSelected = singleTest?.testName === test.name;
          return (
            <TouchableOpacity
              key={test.name}
              style={[
                styles.testChip,
                inBatch && styles.testChipInBatch,
                isSelected && styles.testChipSelected,
              ]}
              onPress={() => handleSelectTest(test, activeCategory)}
            >
              <Text
                style={[
                  styles.testChipText,
                  (inBatch || isSelected) && styles.testChipTextActive,
                ]}
                numberOfLines={1}
              >
                {test.name}
              </Text>
              {inBatch && (
                <Text style={[styles.testChipValue, { color: statusColor(inBatch.value, test.refLow, test.refHigh) }]}>
                  {inBatch.value} {test.unit}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Value Entry */}
      {singleTest && (
        <View style={styles.valueEntry}>
          <Text style={styles.valueLabel}>{singleTest.testName}</Text>
          <View style={styles.valueRow}>
            <TextInput
              style={[styles.input, styles.valueInput]}
              value={singleValue}
              onChangeText={setSingleValue}
              placeholder="Enter value"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              autoFocus
            />
            <Text style={styles.unitText}>{singleTest.unit}</Text>
            <PixelButton title="Add" onPress={handleAddToBatch} disabled={!singleValue.trim()} />
          </View>
          {singleTest.refLow != null && singleTest.refHigh != null && (
            <Text style={styles.refText}>
              Ref: {singleTest.refLow} – {singleTest.refHigh} {singleTest.unit}
            </Text>
          )}
        </View>
      )}

      {/* Batch Summary */}
      {batchEntries.length > 0 && (
        <View style={styles.batchSummary}>
          <Text style={styles.batchTitle}>
            {batchEntries.length} test{batchEntries.length !== 1 ? 's' : ''} queued
          </Text>
          {batchEntries.map((entry) => (
            <View key={entry.testName} style={styles.batchRow}>
              <Text style={styles.batchTestName}>{entry.testName}</Text>
              <Text style={[styles.batchValue, { color: statusColor(entry.value, entry.refLow, entry.refHigh) }]}>
                {entry.value} {entry.unit}
              </Text>
              <TouchableOpacity onPress={() => handleRemoveFromBatch(entry.testName)}>
                <Text style={styles.removeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Notes */}
      <TextInput
        style={[styles.input, styles.notesInput]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Notes (optional)"
        placeholderTextColor={Colors.textMuted}
        multiline
      />

      {/* Save */}
      <PixelButton
        title={`Save ${totalEntries} Result${totalEntries !== 1 ? 's' : ''}`}
        onPress={handleSaveAll}
        disabled={totalEntries === 0}
        loading={saving}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  metaField: {
    flex: 1,
  },
  label: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  input: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    padding: Spacing.sm,
    color: Colors.textPrimary,
  },
  categoryScroll: {
    flexGrow: 0,
  },
  categoryTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background,
    marginRight: Spacing.xs,
  },
  categoryTabActive: {
    backgroundColor: Colors.purple,
  },
  categoryTabText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
  },
  categoryTabTextActive: {
    color: Colors.textOnDark,
  },
  testGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  testChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    backgroundColor: Colors.cardBackground,
  },
  testChipInBatch: {
    borderColor: Colors.success,
    backgroundColor: 'rgba(129, 199, 132, 0.1)',
  },
  testChipSelected: {
    borderColor: Colors.purple,
    backgroundColor: 'rgba(124, 77, 255, 0.1)',
  },
  testChipText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textPrimary,
  },
  testChipTextActive: {
    color: Colors.purple,
  },
  testChipValue: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    marginTop: 1,
  },
  valueEntry: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  valueLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.purple,
    marginBottom: Spacing.sm,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  valueInput: {
    flex: 1,
  },
  unitText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
  },
  refText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  batchSummary: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  batchTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  batchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  batchTestName: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textPrimary,
  },
  batchValue: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
  },
  removeBtn: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.error,
    paddingHorizontal: Spacing.xs,
  },
  notesInput: {
    minHeight: 44,
  },
});
