import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useCalfTracker, type CalfMeasurement } from '../../hooks/use-calf-tracker';

// ── Checklist Row ──

function CheckRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.7}>
      <View style={[styles.checkRow, checked && styles.checkRowDone]}>
        <View style={[styles.checkbox, checked && styles.checkboxDone]}>
          {checked && <Text style={styles.checkmark}>{'\u2713'}</Text>}
        </View>
        <Text style={[styles.checkLabel, checked && styles.checkLabelDone]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Stretch Timer ──

function StretchTracker({
  minutes,
  goal,
  onAdd,
}: {
  minutes: number;
  goal: number;
  onAdd: (min: number) => void;
}) {
  const pct = Math.min((minutes / goal) * 100, 100);
  const barColor = pct >= 100 ? Colors.success : pct >= 50 ? Colors.warning : Colors.babyBlue;

  return (
    <View style={styles.stretchSection}>
      <View style={styles.stretchHeader}>
        <Text style={styles.stretchLabel}>Achilles Stretching</Text>
        <Text style={styles.stretchProgress}>{minutes}/{goal} min</Text>
      </View>
      <View style={styles.progressBarOuter}>
        <View style={[styles.progressBarInner, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
      <View style={styles.stretchButtons}>
        {[10, 15, 20, 30].map((n) => (
          <TouchableOpacity
            key={n}
            style={styles.addMinBtn}
            onPress={() => onAdd(n)}
            activeOpacity={0.7}
          >
            <Text style={styles.addMinText}>+{n}m</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ── Measurement Form ──

function MeasurementForm({
  onSave,
  onCancel,
}: {
  onSave: (m: Omit<CalfMeasurement, 'id' | 'date'>) => Promise<void>;
  onCancel: () => void;
}) {
  const [leftCalf, setLeftCalf] = useState('');
  const [rightCalf, setRightCalf] = useState('');
  const [ankleFlexion, setAnkleFlexion] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!leftCalf || !rightCalf) return;
    setSaving(true);
    try {
      await onSave({
        leftCalf: parseFloat(leftCalf),
        rightCalf: parseFloat(rightCalf),
        ankleFlexion: ankleFlexion ? parseFloat(ankleFlexion) : 0,
        notes,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.measureForm}>
      <Text style={styles.measureTitle}>{'\u{1F4CF}'} New Measurement</Text>
      <View style={styles.measureRow}>
        <View style={styles.measureField}>
          <Text style={styles.measureLabel}>Left Calf (cm)</Text>
          <TextInput
            style={styles.measureInput}
            value={leftCalf}
            onChangeText={setLeftCalf}
            keyboardType="decimal-pad"
            placeholder="e.g., 36.5"
            placeholderTextColor={Colors.textMuted}
          />
        </View>
        <View style={styles.measureField}>
          <Text style={styles.measureLabel}>Right Calf (cm)</Text>
          <TextInput
            style={styles.measureInput}
            value={rightCalf}
            onChangeText={setRightCalf}
            keyboardType="decimal-pad"
            placeholder="e.g., 37.0"
            placeholderTextColor={Colors.textMuted}
          />
        </View>
      </View>
      <View style={styles.measureField}>
        <Text style={styles.measureLabel}>Ankle Flexion ({'\u00B0'} from 90{'\u00B0'})</Text>
        <TextInput
          style={styles.measureInput}
          value={ankleFlexion}
          onChangeText={setAnkleFlexion}
          keyboardType="decimal-pad"
          placeholder="e.g., 15"
          placeholderTextColor={Colors.textMuted}
        />
      </View>
      <TextInput
        style={[styles.measureInput, styles.notesInput]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Notes (optional)"
        placeholderTextColor={Colors.textMuted}
        multiline
      />
      <View style={styles.formActions}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelBtn} activeOpacity={0.7}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveBtn, (!leftCalf || !rightCalf) && styles.saveBtnDisabled]}
          disabled={!leftCalf || !rightCalf || saving}
          activeOpacity={0.7}
        >
          <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Progress History ──

function ProgressHistory({ measurements }: { measurements: CalfMeasurement[] }) {
  if (measurements.length === 0) return null;

  const latest = measurements[measurements.length - 1];
  const baseline = measurements[0];
  const leftDiff = latest.leftCalf - baseline.leftCalf;
  const rightDiff = latest.rightCalf - baseline.rightCalf;

  return (
    <View style={styles.progressSection}>
      <Text style={styles.progressTitle}>{'\u{1F4C8}'} Progress</Text>
      {measurements.length >= 2 && (
        <View style={styles.diffRow}>
          <Text style={styles.diffText}>
            Left: {leftDiff > 0 ? '+' : ''}{leftDiff.toFixed(1)}cm
          </Text>
          <Text style={styles.diffText}>
            Right: {rightDiff > 0 ? '+' : ''}{rightDiff.toFixed(1)}cm
          </Text>
        </View>
      )}
      {measurements.slice().reverse().map((m) => (
        <View key={m.id} style={styles.historyRow}>
          <Text style={styles.historyDate}>{m.date}</Text>
          <Text style={styles.historyValues}>L: {m.leftCalf}cm | R: {m.rightCalf}cm</Text>
          {m.ankleFlexion > 0 && (
            <Text style={styles.historyFlex}>{m.ankleFlexion}{'\u00B0'}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

// ── Main Card ──

export function CalfTrackerCard() {
  const {
    dailyLog,
    measurements,
    loading,
    saveDailyLog,
    saveMeasurement,
    stretchGoalMinutes,
    completedCount,
    totalChecklist,
  } = useCalfTracker();

  const [showMeasureForm, setShowMeasureForm] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (loading) return null;

  return (
    <View style={[styles.card, styles.accentTeal]}>
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
        style={styles.header}
      >
        <Text style={styles.title}>{'\u{1F9B6}'} Calf Recovery</Text>
        <Text style={styles.progress}>{completedCount}/{totalChecklist} done</Text>
      </TouchableOpacity>

      {/* Daily checklist — always visible */}
      <CheckRow
        label="Wore compression socks"
        checked={dailyLog.woreCompressionSocks}
        onToggle={() => saveDailyLog({ woreCompressionSocks: !dailyLog.woreCompressionSocks })}
      />
      <CheckRow
        label="Wore calf sleeves"
        checked={dailyLog.woreCalfSleeves}
        onToggle={() => saveDailyLog({ woreCalfSleeves: !dailyLog.woreCalfSleeves })}
      />

      {/* Stretch tracker */}
      <StretchTracker
        minutes={dailyLog.stretchedMinutes}
        goal={stretchGoalMinutes}
        onAdd={(min) => saveDailyLog({ stretchedMinutes: dailyLog.stretchedMinutes + min })}
      />

      {/* Expandable section */}
      {expanded && (
        <View style={styles.expandedSection}>
          {/* Notes */}
          <TextInput
            style={[styles.measureInput, styles.notesInput]}
            value={dailyLog.notes}
            onChangeText={(text) => saveDailyLog({ notes: text })}
            placeholder="Daily notes (pain, swelling, how it feels...)"
            placeholderTextColor={Colors.textMuted}
            multiline
          />

          {/* Measurement */}
          {showMeasureForm ? (
            <MeasurementForm
              onSave={async (m) => {
                await saveMeasurement(m);
                setShowMeasureForm(false);
              }}
              onCancel={() => setShowMeasureForm(false)}
            />
          ) : (
            <TouchableOpacity
              onPress={() => setShowMeasureForm(true)}
              style={styles.measureBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.measureBtnText}>{'\u{1F4CF}'} Record Measurement</Text>
            </TouchableOpacity>
          )}

          {/* Progress history */}
          <ProgressHistory measurements={measurements} />
        </View>
      )}

      <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
        <Text style={styles.expandToggle}>
          {expanded ? 'Show less \u25B2' : 'Measurements & Notes \u25BC'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    padding: Spacing.md,
    shadowColor: Colors.purple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  accentTeal: {
    borderLeftColor: '#4db6ac',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.textPrimary,
  },
  progress: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.purple,
  },

  // Checklist
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    marginBottom: Spacing.xs,
  },
  checkRowDone: {
    backgroundColor: 'rgba(77, 182, 172, 0.1)',
    borderColor: '#4db6ac',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  checkboxDone: {
    backgroundColor: '#4db6ac',
    borderColor: '#4db6ac',
  },
  checkmark: {
    color: Colors.textOnDark,
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
  },
  checkLabelDone: {
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },

  // Stretch
  stretchSection: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  stretchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stretchLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
  },
  stretchProgress: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
  },
  progressBarOuter: {
    height: 8,
    backgroundColor: '#f0eaf8',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarInner: {
    height: '100%',
    borderRadius: 4,
  },
  stretchButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  addMinBtn: {
    flex: 1,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    alignItems: 'center',
  },
  addMinText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.purple,
  },

  // Expanded
  expandedSection: {
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  expandToggle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.purple,
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
  },

  // Measurement form
  measureForm: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  measureTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  measureRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  measureField: {
    flex: 1,
    marginBottom: Spacing.xs,
  },
  measureLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  measureInput: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    padding: Spacing.sm,
  },
  notesInput: {
    minHeight: 50,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  cancelBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  cancelText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
  },
  saveBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: '#4db6ac',
    borderRadius: BorderRadius.md,
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textOnDark,
  },
  measureBtn: {
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#4db6ac',
    alignItems: 'center',
  },
  measureBtnText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: '#4db6ac',
  },

  // Progress history
  progressSection: {
    gap: Spacing.xs,
  },
  progressTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  diffRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  diffText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.purple,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.tabBarBorder,
  },
  historyDate: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    width: 80,
  },
  historyValues: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
    flex: 1,
  },
  historyFlex: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
  },
});
