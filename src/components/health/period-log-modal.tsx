import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { PixelButton } from '../ui/pixel-button';
import type { PeriodLog, FlowLevel } from '../../types/database';
import type { PeriodLogInput } from '../../hooks/use-period-calendar';

interface PeriodLogModalProps {
  visible: boolean;
  dateKey: string | null;
  existingLog: PeriodLog | null;
  saving: boolean;
  onSave: (dateKey: string, input: PeriodLogInput) => Promise<void>;
  onDelete: (dateKey: string) => Promise<void>;
  onClose: () => void;
}

const FLOW_OPTIONS: { value: FlowLevel; label: string; emoji: string }[] = [
  { value: 'spotting', label: 'Spotting', emoji: '.' },
  { value: 'light', label: 'Light', emoji: '*' },
  { value: 'medium', label: 'Medium', emoji: '**' },
  { value: 'heavy', label: 'Heavy', emoji: '***' },
];

const CRAMP_LABELS = ['None', 'Mild', 'Moderate', 'Strong', 'Severe', 'Extreme'];

export function PeriodLogModal({
  visible,
  dateKey,
  existingLog,
  saving,
  onSave,
  onDelete,
  onClose,
}: PeriodLogModalProps) {
  const [flow, setFlow] = useState<FlowLevel | null>(null);
  const [cramps, setCramps] = useState(0);
  const [headache, setHeadache] = useState(false);
  const [backPain, setBackPain] = useState(false);
  const [notes, setNotes] = useState('');

  // Reset form when modal opens with new data
  useEffect(() => {
    if (visible) {
      setFlow(existingLog?.flow ?? null);
      setCramps(existingLog?.cramps ?? 0);
      setHeadache(existingLog?.headache ?? false);
      setBackPain(existingLog?.back_pain ?? false);
      setNotes(existingLog?.notes ?? '');
    }
  }, [visible, existingLog]);

  const handleSave = useCallback(async () => {
    if (!dateKey) return;
    await onSave(dateKey, {
      flow,
      cramps,
      headache,
      back_pain: backPain,
      notes: notes.trim() || null,
    });
    onClose();
  }, [dateKey, flow, cramps, headache, backPain, notes, onSave, onClose]);

  const handleDelete = useCallback(async () => {
    if (!dateKey) return;
    await onDelete(dateKey);
    onClose();
  }, [dateKey, onDelete, onClose]);

  const formattedDate = dateKey
    ? new Date(dateKey + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : '';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Period Log</Text>
              <Text style={styles.dateText}>{formattedDate}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeText}>X</Text>
              </TouchableOpacity>
            </View>

            {/* Flow Level */}
            <Text style={styles.sectionLabel}>Flow Level</Text>
            <View style={styles.flowRow}>
              {FLOW_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.flowChip, flow === opt.value && styles.flowChipActive]}
                  onPress={() => setFlow(flow === opt.value ? null : opt.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.flowChipText, flow === opt.value && styles.flowChipTextActive]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Cramps */}
            <Text style={styles.sectionLabel}>
              Cramps: {CRAMP_LABELS[cramps]}
            </Text>
            <View style={styles.crampsRow}>
              {CRAMP_LABELS.map((label, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.crampDot, cramps >= i && styles.crampDotActive]}
                  onPress={() => setCramps(cramps === i ? 0 : i)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.crampNum, cramps >= i && styles.crampNumActive]}>
                    {i}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Symptoms toggles */}
            <Text style={styles.sectionLabel}>Symptoms</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleChip, headache && styles.toggleChipActive]}
                onPress={() => setHeadache(!headache)}
                activeOpacity={0.7}
              >
                <Text style={[styles.toggleText, headache && styles.toggleTextActive]}>
                  Headache
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleChip, backPain && styles.toggleChipActive]}
                onPress={() => setBackPain(!backPain)}
                activeOpacity={0.7}
              >
                <Text style={[styles.toggleText, backPain && styles.toggleTextActive]}>
                  Back Pain
                </Text>
              </TouchableOpacity>
            </View>

            {/* Notes */}
            <Text style={styles.sectionLabel}>Notes</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any notes..."
              placeholderTextColor={Colors.textMuted}
              multiline
              maxLength={500}
            />

            {/* Actions */}
            <View style={styles.actions}>
              <PixelButton
                title={existingLog ? 'Update' : 'Save'}
                onPress={handleSave}
                loading={saving}
                disabled={!flow && cramps === 0 && !headache && !backPain}
              />
              {existingLog && (
                <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
                  <Text style={styles.deleteText}>Remove Log</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.cardBackground,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    maxHeight: '80%',
    ...Shadows.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: Fonts.pixel,
    fontSize: FontSizes.md,
    color: Colors.purple,
    flex: 1,
  },
  dateText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    marginRight: Spacing.md,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.softPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontFamily: Fonts.pixel,
    fontSize: FontSizes.xs,
    color: Colors.purple,
  },
  sectionLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  flowRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  flowChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.softPink,
    backgroundColor: Colors.cardBackground,
  },
  flowChipActive: {
    backgroundColor: Colors.softPink,
    borderColor: Colors.pink,
  },
  flowChipText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
  },
  flowChipTextActive: {
    color: Colors.textPrimary,
  },
  crampsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  crampDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.tabBarBorder,
    backgroundColor: Colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crampDotActive: {
    backgroundColor: Colors.warning,
    borderColor: Colors.warning,
  },
  crampNum: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
  },
  crampNumActive: {
    color: Colors.textOnDark,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  toggleChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.tabBarBorder,
    backgroundColor: Colors.cardBackground,
  },
  toggleChipActive: {
    backgroundColor: Colors.lavender,
    borderColor: Colors.purple,
  },
  toggleText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
  },
  toggleTextActive: {
    color: Colors.textOnDark,
  },
  notesInput: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  actions: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  deleteBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  deleteText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.error,
  },
});
