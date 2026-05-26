/**
 * DailyCheckinCard — extracted check-in module with the May 7 "Saved!" UX
 * and collapsed-summary row.
 *
 * Restored from May 7 bundle (module 1196, line 97881).
 *
 * Behaviors added relative to baseline (which had this inlined in index.tsx):
 *  1. Button title flips to "✓ Saved!" for ~1800ms after a save, then a green
 *     "✓ Check-in saved for this day" confirmation appears beneath it.
 *  2. When the card is collapsed AND there's a prior submission, a compact
 *     summary row is shown: "{emoji} mood", "{emoji} energy", "🩸 {periodStatus}"
 *     (only the populated values).
 *
 * The parent owns the state machine (mood, energy, period, symptoms, notes,
 * saving, justSaved). The card is purely presentational.
 */
import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Platform } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { PixelButton } from '../ui';
import { EmojiPicker } from './emoji-picker';
import { SymptomChip } from './symptom-chip';
import { SeverityDots } from './severity-dots';
import {
  MOOD_OPTIONS,
  ENERGY_OPTIONS,
  PERIOD_OPTIONS,
  SYMPTOM_OPTIONS,
} from '../../constants/check-in';
import type { SymptomType } from '../../types/database';

interface DailyCheckinCardProps {
  checkinOpen: boolean;
  setCheckinOpen: (v: boolean) => void;
  hasSubmittedToday: boolean;
  savedMood: number | null;
  savedEnergy: number | null;
  mood: number | null;
  setMood: (v: number | null) => void;
  energy: number | null;
  setEnergy: (v: number | null) => void;
  periodStatus: string;
  setPeriodStatus: (v: string) => void;
  love: boolean;
  setLove: (v: boolean) => void;
  selectedSymptoms: Map<SymptomType, number>;
  toggleSymptom: (type: SymptomType) => void;
  updateSymptomSeverity: (type: SymptomType, severity: number) => void;
  notes: string;
  setNotes: (v: string) => void;
  saving: boolean;
  justSaved: boolean;
  saveError: string | null;
  onSave: () => void;
}

export const DailyCheckinCard = React.memo(function DailyCheckinCard({
  checkinOpen,
  setCheckinOpen,
  hasSubmittedToday,
  savedMood,
  savedEnergy,
  mood,
  setMood,
  energy,
  setEnergy,
  periodStatus,
  setPeriodStatus,
  love,
  setLove,
  selectedSymptoms,
  toggleSymptom,
  updateSymptomSeverity,
  notes,
  setNotes,
  saving,
  justSaved,
  saveError,
  onSave,
}: DailyCheckinCardProps) {
  return (
    <View style={[styles.accentCard, styles.accentPink]}>
      <TouchableOpacity
        onPress={() => setCheckinOpen(!checkinOpen)}
        activeOpacity={0.7}
        style={styles.checkinHeader}
      >
        <Text style={styles.sectionTitle}>📝 Daily Check-in</Text>
        <Text style={styles.collapseIcon}>
          {checkinOpen ? '▲' : hasSubmittedToday ? '✅' : '▼'}
        </Text>
      </TouchableOpacity>

      {/* Compact summary when collapsed + submitted */}
      {!checkinOpen && hasSubmittedToday && (
        <View style={styles.checkinSummaryRow}>
          {savedMood !== null && (
            <Text style={styles.checkinSummaryItem}>
              {MOOD_OPTIONS.find((o) => o.value === savedMood)?.emoji ?? '·'} mood
            </Text>
          )}
          {savedEnergy !== null && (
            <Text style={styles.checkinSummaryItem}>
              {ENERGY_OPTIONS.find((o) => o.value === savedEnergy)?.emoji ?? '·'} energy
            </Text>
          )}
          {periodStatus !== 'off' && (
            <Text style={styles.checkinSummaryItem}>🩸 {periodStatus}</Text>
          )}
        </View>
      )}

      {checkinOpen && (
        <View style={styles.checkinBody}>
          {/* Mood */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Mood</Text>
            <EmojiPicker options={MOOD_OPTIONS} selected={mood} onSelect={setMood} />
          </View>

          {/* Energy */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Energy</Text>
            <EmojiPicker options={ENERGY_OPTIONS} selected={energy} onSelect={setEnergy} />
          </View>

          {/* Period */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Period</Text>
            <View style={styles.periodRow}>
              {PERIOD_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setPeriodStatus(opt.value)}
                  style={[
                    styles.periodPill,
                    periodStatus === opt.value &&
                      (opt.value === 'off' ? styles.periodPillOff : styles.periodPillOn),
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.periodPillText,
                      periodStatus === opt.value && styles.periodPillTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Love */}
          <View style={styles.fieldGroup}>
            <TouchableOpacity
              onPress={() => setLove(!love)}
              style={[styles.lovePill, love && styles.lovePillActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.lovePillText, love && styles.lovePillTextActive]}>
                {love ? '❤️' : '🤍'} Love
              </Text>
            </TouchableOpacity>
          </View>

          {/* Symptoms */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Symptoms</Text>
            <View style={styles.chipWrap}>
              {SYMPTOM_OPTIONS.map((opt) => (
                <SymptomChip
                  key={opt.type}
                  label={opt.label}
                  active={selectedSymptoms.has(opt.type)}
                  onPress={() => toggleSymptom(opt.type)}
                />
              ))}
            </View>
            {Array.from(selectedSymptoms.entries()).map(([type, severity]) => {
              const label = SYMPTOM_OPTIONS.find((o) => o.type === type)?.label ?? type;
              return (
                <View key={type} style={styles.severitySection}>
                  <Text style={styles.severityLabel}>{label} severity</Text>
                  <SeverityDots
                    severity={severity}
                    onSelect={(v) => updateSymptomSeverity(type, v)}
                  />
                </View>
              );
            })}
          </View>

          {/* Notes */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="How are you feeling today?"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Save */}
          <PixelButton
            title={justSaved ? '✓ Saved!' : saving ? 'Saving...' : 'Save Check-in'}
            onPress={onSave}
            loading={saving}
            disabled={saving || justSaved}
          />
          {justSaved && (
            <Text style={styles.savedConfirmation}>
              ✓ Check-in saved to cloud for this day
            </Text>
          )}
          {saveError && (
            <Text style={styles.saveError}>
              ⚠ {saveError}
            </Text>
          )}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  accentCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    padding: Spacing.md,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(124, 77, 255, 0.06)',
      },
      default: {
        shadowColor: '#7c4dff',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  accentPink: { borderLeftColor: '#f48fb1' },
  sectionTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.textPrimary,
  },
  checkinHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  collapseIcon: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
  },
  checkinSummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  checkinSummaryItem: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
  },
  checkinBody: { marginTop: Spacing.lg },
  fieldGroup: { marginBottom: Spacing.lg },
  fieldLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  savedConfirmation: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.success,
    textAlign: 'center',
    marginTop: Spacing.sm,
    fontWeight: '600',
  },
  saveError: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing.sm,
    fontWeight: '600',
  },
  periodRow: { flexDirection: 'row', gap: Spacing.sm },
  periodPill: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
  },
  periodPillOff: {
    backgroundColor: Colors.softPurple,
    borderColor: Colors.purple,
  },
  periodPillOn: {
    backgroundColor: Colors.pink,
    borderColor: Colors.pink,
  },
  periodPillText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
  },
  periodPillTextActive: { color: Colors.textOnDark },
  lovePill: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
  },
  lovePillActive: {
    backgroundColor: Colors.pink,
    borderColor: Colors.pink,
  },
  lovePillText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
  },
  lovePillTextActive: { color: Colors.textOnDark },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  severitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  severityLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
    flex: 1,
  },
  notesInput: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    padding: Spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
