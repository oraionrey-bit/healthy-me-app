import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
} from 'react-native';
import { PixelCard, PixelButton } from '../ui';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useLabs, COMMON_LAB_TESTS } from '../../hooks/use-labs';
import { toDateKey } from '../../utils/storage';

function FlagBadge({ isFlagged }: { isFlagged: boolean }) {
  if (!isFlagged) return null;
  return (
    <View style={styles.flagBadge}>
      <Text style={styles.flagText}>⚠️ OUT</Text>
    </View>
  );
}

export function LabsEntry() {
  const { labs, loading, addLab, deleteLab, flaggedLabs, latestByTest } = useLabs();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Form state
  const [testName, setTestName] = useState('');
  const [testValue, setTestValue] = useState('');
  const [testUnit, setTestUnit] = useState('');
  const [testDate, setTestDate] = useState(toDateKey(new Date()));
  const [refLow, setRefLow] = useState('');
  const [refHigh, setRefHigh] = useState('');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const resetForm = () => {
    setTestName('');
    setTestValue('');
    setTestUnit('');
    setTestDate(toDateKey(new Date()));
    setRefLow('');
    setRefHigh('');
    setNotes('');
    setShowAddForm(false);
  };

  const selectCommonTest = (test: typeof COMMON_LAB_TESTS[number]) => {
    setTestName(test.name);
    setTestUnit(test.unit);
    if (test.refLow != null) setRefLow(String(test.refLow));
    if (test.refHigh != null) setRefHigh(String(test.refHigh));
    setShowPicker(false);
  };

  const handleSubmit = async () => {
    const val = parseFloat(testValue);
    if (!testName.trim() || isNaN(val)) return;

    await addLab({
      testName: testName.trim(),
      value: val,
      unit: testUnit.trim(),
      testDate,
      refLow: refLow ? parseFloat(refLow) : null,
      refHigh: refHigh ? parseFloat(refHigh) : null,
      notes: notes.trim() || undefined,
    });
    resetForm();
  };

  const filteredTests = searchQuery
    ? COMMON_LAB_TESTS.filter((t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : COMMON_LAB_TESTS;

  const categories = [...new Set(filteredTests.map((t) => t.category))];

  if (loading) return null;

  return (
    <PixelCard>
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
        style={styles.header}
      >
        <Text style={styles.title}>🔬 Lab Results</Text>
        <View style={styles.headerRight}>
          {flaggedLabs.length > 0 && (
            <View style={styles.flagCount}>
              <Text style={styles.flagCountText}>
                ⚠️ {flaggedLabs.length}
              </Text>
            </View>
          )}
          <Text style={styles.collapseIcon}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {/* Summary row — always visible */}
      {latestByTest.length > 0 && (
        <Text style={styles.summaryText}>
          {latestByTest.length} test{latestByTest.length !== 1 ? 's' : ''} tracked
        </Text>
      )}

      {expanded && (
        <View style={styles.expandedContent}>
          {/* Add button */}
          {!showAddForm && (
            <PixelButton
              title="+ Add Lab Result"
              onPress={() => setShowAddForm(true)}
            />
          )}

          {/* Add form */}
          {showAddForm && (
            <View style={styles.form}>
              {/* Test name with picker */}
              <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.pickerTrigger}>
                <Text style={testName ? styles.pickerText : styles.pickerPlaceholder}>
                  {testName || 'Select or type test name...'}
                </Text>
                <Text style={styles.pickerArrow}>▼</Text>
              </TouchableOpacity>

              {/* Custom test name input */}
              <TextInput
                style={styles.input}
                value={testName}
                onChangeText={setTestName}
                placeholder="Or type custom test name"
                placeholderTextColor={Colors.textMuted}
              />

              {/* Value + Unit row */}
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, { flex: 2 }]}
                  value={testValue}
                  onChangeText={setTestValue}
                  placeholder="Value"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={testUnit}
                  onChangeText={setTestUnit}
                  placeholder="Unit"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>

              {/* Date */}
              <TextInput
                style={styles.input}
                value={testDate}
                onChangeText={setTestDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textMuted}
              />

              {/* Reference range */}
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={refLow}
                  onChangeText={setRefLow}
                  placeholder="Ref Low"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.rangeDash}>–</Text>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={refHigh}
                  onChangeText={setRefHigh}
                  placeholder="Ref High"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Notes */}
              <TextInput
                style={styles.input}
                value={notes}
                onChangeText={setNotes}
                placeholder="Notes (optional)"
                placeholderTextColor={Colors.textMuted}
              />

              <View style={styles.formActions}>
                <PixelButton title="Cancel" variant="outline" onPress={resetForm} />
                <PixelButton
                  title="Save"
                  onPress={handleSubmit}
                  disabled={!testName.trim() || !testValue}
                />
              </View>
            </View>
          )}

          {/* Recent results */}
          {latestByTest.length > 0 && (
            <View style={styles.resultsList}>
              <Text style={styles.resultsTitle}>Latest Results</Text>
              {latestByTest.map((lab) => (
                <TouchableOpacity
                  key={lab.id}
                  style={styles.resultRow}
                  onLongPress={() => deleteLab(lab.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName}>{lab.test_name}</Text>
                    <Text style={styles.resultDate}>
                      {new Date(lab.test_date + 'T00:00:00').toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View style={styles.resultValueWrap}>
                    <Text style={[styles.resultValue, lab.is_flagged && styles.resultValueFlagged]}>
                      {lab.value} {lab.unit}
                    </Text>
                    <FlagBadge isFlagged={lab.is_flagged} />
                  </View>
                </TouchableOpacity>
              ))}
              <Text style={styles.deleteTip}>Long press to delete</Text>
            </View>
          )}
        </View>
      )}

      {/* Test picker modal */}
      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Lab Test</Text>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search tests..."
              placeholderTextColor={Colors.textMuted}
              autoFocus
            />
            <ScrollView style={styles.testList}>
              {categories.map((cat) => (
                <View key={cat}>
                  <Text style={styles.categoryTitle}>{cat}</Text>
                  {filteredTests
                    .filter((t) => t.category === cat)
                    .map((test) => (
                      <TouchableOpacity
                        key={test.name}
                        style={styles.testOption}
                        onPress={() => selectCommonTest(test)}
                      >
                        <Text style={styles.testOptionName}>{test.name}</Text>
                        <Text style={styles.testOptionUnit}>{test.unit}</Text>
                      </TouchableOpacity>
                    ))}
                </View>
              ))}
            </ScrollView>
            <PixelButton title="Cancel" variant="outline" onPress={() => setShowPicker(false)} />
          </View>
        </View>
      </Modal>
    </PixelCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.textPrimary,
  },
  collapseIcon: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
  },
  flagCount: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(229, 115, 115, 0.15)',
  },
  flagCountText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.error,
  },
  summaryText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  expandedContent: {
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  form: {
    gap: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
  },
  pickerTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    padding: Spacing.md,
  },
  pickerText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
  },
  pickerPlaceholder: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textMuted,
  },
  pickerArrow: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
  },
  input: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    padding: Spacing.md,
    color: Colors.textPrimary,
  },
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  rangeDash: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textMuted,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  resultsList: {
    gap: Spacing.sm,
  },
  resultsTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textSecondary,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.tabBarBorder,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
  },
  resultDate: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
  },
  resultValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  resultValue: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.purple,
  },
  resultValueFlagged: {
    color: Colors.error,
  },
  flagBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(229, 115, 115, 0.15)',
  },
  flagText: {
    fontFamily: Fonts.body,
    fontSize: 8,
    color: Colors.error,
  },
  deleteTip: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    maxHeight: '80%',
  },
  modalTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  searchInput: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    padding: Spacing.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  testList: {
    maxHeight: 400,
    marginBottom: Spacing.md,
  },
  categoryTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.purple,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  testOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.tabBarBorder,
  },
  testOptionName: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
  },
  testOptionUnit: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
  },
});
