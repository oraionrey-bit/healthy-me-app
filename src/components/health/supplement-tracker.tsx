import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { PixelCard, PixelButton } from '../ui';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useSupplements, type SupplementFeeling, type FeelingEntry } from '../../hooks/use-supplements';
import { MetforminPhasingCard } from './metformin-phasing-card';
import type { UserSupplement } from '../../types/database';

const FEELING_OPTIONS: Array<{ value: SupplementFeeling; emoji: string; label: string }> = [
  { value: 'good', emoji: '\u{1F44D}', label: 'Good' },
  { value: 'neutral', emoji: '\u{1F610}', label: 'Neutral' },
  { value: 'bad', emoji: '\u{1F44E}', label: 'Bad' },
];

const TIME_OPTIONS = [
  { value: 'morning', label: '\u2600\uFE0F Morning' },
  { value: 'evening', label: '\u{1F319} Evening' },
];

// ── Add/Edit Form ──

function SupplementForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial?: { name: string; dosage: string; timeOfDay: string; notes: string };
  onSubmit: (data: { name: string; dosage: string; timeOfDay: string; notes: string }) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [dosage, setDosage] = useState(initial?.dosage ?? '');
  const [selectedTimes, setSelectedTimes] = useState<Set<string>>(() => {
    const initialTod = initial?.timeOfDay ?? 'morning';
    return new Set(initialTod.split(','));
  });
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const toggleTime = (value: string) => {
    setSelectedTimes((prev) => {
      if (initial) return new Set([value]);
      const next = new Set(prev);
      if (next.has(value)) {
        if (next.size > 1) next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  };

  const selectedTimeValues = ['morning', 'evening'].filter((t) => selectedTimes.has(t));
  // Editing always targets one scheduled row. Add may intentionally create one
  // row per selected time via useSupplements.addSupplement.
  const timeOfDay = initial ? selectedTimeValues[0] : selectedTimeValues.join(',');

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), dosage: dosage.trim(), timeOfDay, notes: notes.trim() });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.form}>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g., Vitamin D"
          placeholderTextColor={Colors.textMuted}
        />
      </View>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Dosage</Text>
        <TextInput
          style={styles.input}
          value={dosage}
          onChangeText={setDosage}
          placeholder="e.g., 500mg"
          placeholderTextColor={Colors.textMuted}
        />
      </View>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Time</Text>
        <View style={styles.timeRow}>
          {TIME_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.timePill, selectedTimes.has(opt.value) && styles.timePillActive]}
              onPress={() => toggleTime(opt.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.timePillText, selectedTimes.has(opt.value) && styles.timePillTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Notes</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Why you take this, what to watch for..."
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={2}
        />
      </View>
      <View style={styles.formButtons}>
        <PixelButton title="Cancel" variant="outline" onPress={onCancel} />
        <PixelButton
          title={saving ? 'Saving...' : submitLabel}
          onPress={handleSubmit}
          disabled={saving || !name.trim()}
          loading={saving}
        />
      </View>
    </View>
  );
}

// ── Supplement Row ──

function SupplementRow({
  supplement,
  feeling,
  isFirst,
  isLast,
  onExpand,
  expanded,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onLogFeeling,
}: {
  supplement: UserSupplement;
  feeling: FeelingEntry | null;
  isFirst: boolean;
  isLast: boolean;
  expanded: boolean;
  onExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onLogFeeling: (feeling: SupplementFeeling, note?: string) => void;
}) {
  const [feelingNote, setFeelingNote] = useState('');

  const handleDelete = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(`Remove "${supplement.supplement_name}"?`)) onDelete();
    } else {
      Alert.alert('Remove Supplement', `Remove "${supplement.supplement_name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: onDelete },
      ]);
    }
  };

  return (
    <View style={styles.suppRow}>
      <TouchableOpacity onPress={onExpand} activeOpacity={0.7} style={styles.suppHeader}>
        <View style={styles.suppInfo}>
          <Text style={styles.suppName}>{supplement.supplement_name}</Text>
          <Text style={styles.suppMeta}>
            {supplement.dosage ?? '\u2014'} · {supplement.time_of_day.includes('morning') ? '\u2600\uFE0F' : ''}{supplement.time_of_day.includes('evening') ? '\u{1F319}' : ''}
            {feeling ? ` · ${FEELING_OPTIONS.find((f) => f.value === feeling.feeling)?.emoji ?? ''}` : ''}
          </Text>
        </View>
        <Text style={styles.expandIcon}>{expanded ? '\u25B2' : '\u25BC'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.expandedContent}>
          {supplement.notes && (
            <View style={styles.notesDisplay}>
              <Text style={styles.notesLabel}>{'\u{1F4DD}'} Notes</Text>
              <Text style={styles.notesText}>{supplement.notes}</Text>
            </View>
          )}

          <View style={styles.feelingSection}>
            <Text style={styles.feelingLabel}>How does this make you feel today?</Text>
            <View style={styles.feelingRow}>
              {FEELING_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.feelingBtn,
                    feeling?.feeling === opt.value && styles.feelingBtnActive,
                  ]}
                  onPress={() => onLogFeeling(opt.value, feelingNote || undefined)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.feelingEmoji}>{opt.emoji}</Text>
                  <Text style={[
                    styles.feelingBtnLabel,
                    feeling?.feeling === opt.value && styles.feelingBtnLabelActive,
                  ]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.feelingNoteInput}
              value={feelingNote}
              onChangeText={setFeelingNote}
              placeholder="Optional note..."
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={styles.actionRow}>
            <View style={styles.moveButtons}>
              <TouchableOpacity
                onPress={onMoveUp}
                disabled={isFirst}
                style={[styles.moveBtn, isFirst && styles.moveBtnDisabled]}
                activeOpacity={0.7}
              >
                <Text style={styles.moveBtnText}>{'\u25B2'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onMoveDown}
                disabled={isLast}
                style={[styles.moveBtn, isLast && styles.moveBtnDisabled]}
                activeOpacity={0.7}
              >
                <Text style={styles.moveBtnText}>{'\u25BC'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.editDeleteRow}>
              <TouchableOpacity onPress={onEdit} style={styles.editBtn} activeOpacity={0.7}>
                <Text style={styles.editBtnText}>{'\u270F\uFE0F'} Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} activeOpacity={0.7}>
                <Text style={styles.deleteBtnText}>{'\u{1F5D1}'} Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

// ── Main Tracker ──

export function SupplementTracker() {
  const {
    supplements,
    morningSupplements,
    eveningSupplements,
    loading,
    addSupplement,
    updateSupplement,
    deleteSupplement,
    logFeeling,
    getFeelingForToday,
    advancePhase,
    reorderSupplements,
  } = useSupplements();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const handleMoveUp = async (idx: number) => {
    if (idx === 0) return;
    const ids = supplements.map((s) => s.id);
    [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
    await reorderSupplements(ids);
  };

  const handleMoveDown = async (idx: number) => {
    if (idx >= supplements.length - 1) return;
    const ids = supplements.map((s) => s.id);
    [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
    await reorderSupplements(ids);
  };

  if (loading) return null;

  const renderGroup = (title: string, items: UserSupplement[]) => {
    if (items.length === 0) return null;
    return (
      <View style={styles.group}>
        <Text style={styles.groupLabel}>{title}</Text>
        {items.map((supp) => {
          const globalIdx = supplements.findIndex((s) => s.id === supp.id);

          if (editingId === supp.id) {
            return (
              <SupplementForm
                key={supp.id}
                initial={{
                  name: supp.supplement_name,
                  dosage: supp.dosage ?? '',
                  timeOfDay: supp.time_of_day,
                  notes: supp.notes ?? '',
                }}
                submitLabel="Save"
                onSubmit={async (data) => {
                  await updateSupplement(supp.id, {
                    supplement_name: data.name,
                    dosage: data.dosage,
                    time_of_day: data.timeOfDay,
                    notes: data.notes || undefined,
                  });
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            );
          }

          return (
            <SupplementRow
              key={supp.id}
              supplement={supp}
              feeling={getFeelingForToday(supp.id)}
              isFirst={globalIdx === 0}
              isLast={globalIdx === supplements.length - 1}
              expanded={expandedId === supp.id}
              onExpand={() => setExpandedId(expandedId === supp.id ? null : supp.id)}
              onEdit={() => {
                setEditingId(supp.id);
                setExpandedId(null);
                setShowAddForm(false);
              }}
              onDelete={() => deleteSupplement(supp.id)}
              onMoveUp={() => handleMoveUp(globalIdx)}
              onMoveDown={() => handleMoveDown(globalIdx)}
              onLogFeeling={(f, note) => logFeeling(supp.id, f, note)}
            />
          );
        })}
      </View>
    );
  };

  return (
    <PixelCard>
      <View style={styles.header}>
        <Text style={styles.title}>{'\u{1F48A}'} My Supplements</Text>
        <Text style={styles.countBadge}>{supplements.length}</Text>
      </View>

      {supplements.length === 0 && !showAddForm && (
        <Text style={styles.emptyText}>No supplements yet {'\u2014'} tap + to add one</Text>
      )}

      {/* Phasing cards for supplements with phase schedules */}
      {supplements
        .filter((s) => s.phase_schedule != null)
        .map((s) => (
          <MetforminPhasingCard
            key={`phasing-${s.id}`}
            supplement={s}
            onAdvancePhase={advancePhase}
          />
        ))}

      {renderGroup('\u2600\uFE0F Morning', morningSupplements)}
      {renderGroup('\u{1F319} Evening', eveningSupplements)}

      {showAddForm ? (
        <SupplementForm
          submitLabel="Add"
          onSubmit={async (data) => {
            await addSupplement(data.name, data.dosage, data.timeOfDay, data.notes || undefined);
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      ) : (
        <View style={styles.addWrap}>
          <PixelButton
            title="+ Add Supplement"
            variant="outline"
            onPress={() => {
              setShowAddForm(true);
              setEditingId(null);
              setExpandedId(null);
            }}
          />
        </View>
      )}
    </PixelCard>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
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
  countBadge: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.purple,
    backgroundColor: Colors.softPurple,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  group: {
    marginBottom: Spacing.md,
  },
  groupLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  suppRow: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.tabBarBorder,
  },
  suppHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  suppInfo: {
    flex: 1,
  },
  suppName: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
  },
  suppMeta: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  expandIcon: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    marginLeft: Spacing.sm,
  },
  expandedContent: {
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  notesDisplay: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  notesLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  notesText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
  },
  feelingSection: {
    gap: Spacing.xs,
  },
  feelingLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
  },
  feelingRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  feelingBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
  },
  feelingBtnActive: {
    borderColor: Colors.purple,
    backgroundColor: Colors.softPurple,
  },
  feelingEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  feelingBtnLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
  },
  feelingBtnLabelActive: {
    color: Colors.purple,
  },
  feelingNoteInput: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    padding: Spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moveButtons: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  moveBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
  },
  moveBtnDisabled: {
    opacity: 0.3,
  },
  moveBtnText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
  },
  editDeleteRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  editBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  editBtnText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.purple,
  },
  deleteBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  deleteBtnText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.error,
  },
  form: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
  },
  fieldGroup: {
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  input: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    padding: Spacing.md,
  },
  notesInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  timeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  timePill: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    alignItems: 'center',
  },
  timePillActive: {
    backgroundColor: Colors.purple,
    borderColor: Colors.purple,
  },
  timePillText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
  },
  timePillTextActive: {
    color: Colors.textOnDark,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  addWrap: {
    marginTop: Spacing.sm,
  },
});
