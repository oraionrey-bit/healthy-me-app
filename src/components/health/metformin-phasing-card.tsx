import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { PixelCard, PixelButton } from '../ui';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import type { UserSupplement, SupplementPhaseSchedule } from '../../types/database';

interface MetforminPhasingCardProps {
  supplement: UserSupplement;
  onAdvancePhase: (supplementId: string, nextPhase: number) => Promise<void>;
}

function daysBetween(a: string, b: string): number {
  const d1 = new Date(a + 'T00:00:00');
  const d2 = new Date(b + 'T00:00:00');
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

function toDateKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function MetforminPhasingCard({ supplement, onAdvancePhase }: MetforminPhasingCardProps) {
  const schedule = supplement.phase_schedule;
  if (!schedule || !schedule.phases || schedule.phases.length === 0) return null;

  const currentPhaseIdx = schedule.phases.findIndex((p) => p.phase === schedule.current_phase);
  if (currentPhaseIdx === -1) return null;

  const currentPhase = schedule.phases[currentPhaseIdx];
  const nextPhase = currentPhaseIdx < schedule.phases.length - 1
    ? schedule.phases[currentPhaseIdx + 1]
    : null;

  const today = toDateKey(new Date());
  const daysInPhase = daysBetween(schedule.phase_started_at, today);
  const daysTotal = daysBetween(schedule.start_date, today);

  // Calculate when current phase ends
  const phaseWeeks = currentPhase.duration_weeks;
  const phaseDaysTarget = phaseWeeks != null ? phaseWeeks * 7 : null;
  const daysRemaining = phaseDaysTarget != null ? Math.max(0, phaseDaysTarget - daysInPhase) : null;

  // Progress: how far through the TOTAL phasing plan
  const totalPlanWeeks = schedule.phases.reduce((sum, p) => sum + (p.duration_weeks ?? 0), 0);
  const weeksCompleted = schedule.phases
    .filter((p) => p.phase < schedule.current_phase)
    .reduce((sum, p) => sum + (p.duration_weeks ?? 0), 0);
  const currentWeekProgress = phaseWeeks != null ? Math.min(daysInPhase / 7, phaseWeeks) : 0;
  const overallProgress = totalPlanWeeks > 0
    ? Math.min(1, (weeksCompleted + currentWeekProgress) / totalPlanWeeks)
    : currentPhaseIdx / schedule.phases.length;

  const isFinalPhase = nextPhase === null;

  const handleAdvance = () => {
    if (!nextPhase) return;
    const message = `Move to ${nextPhase.label}?\n\nThis updates your current dosage phase.`;
    if (Platform.OS === 'web') {
      if (window.confirm(message)) {
        onAdvancePhase(supplement.id, nextPhase.phase);
      }
    } else {
      Alert.alert('Advance Phase', message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Advance', onPress: () => onAdvancePhase(supplement.id, nextPhase.phase) },
      ]);
    }
  };

  return (
    <PixelCard>
      <View style={styles.header}>
        <Text style={styles.title}>{'\u{1F48A}'} {supplement.supplement_name} Phasing</Text>
      </View>

      {/* Current phase */}
      <View style={styles.currentPhase}>
        <Text style={styles.phaseLabel}>
          Phase {currentPhase.phase}: {currentPhase.label}
        </Text>
        <Text style={styles.phaseMeta}>
          Day {daysInPhase + 1} of phase
          {phaseDaysTarget != null ? ` (${phaseDaysTarget} days)` : ''}
          {' \u00B7 '} Day {daysTotal + 1} overall
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.round(overallProgress * 100)}%` }]} />
          {/* Phase markers */}
          {schedule.phases.map((phase, idx) => {
            if (idx === 0) return null;
            const weeksBefore = schedule.phases
              .slice(0, idx)
              .reduce((sum, p) => sum + (p.duration_weeks ?? 0), 0);
            const position = totalPlanWeeks > 0 ? (weeksBefore / totalPlanWeeks) * 100 : 0;
            if (position <= 0 || position >= 100) return null;
            return (
              <View
                key={phase.phase}
                style={[styles.phaseMarker, { left: `${position}%` }]}
              />
            );
          })}
        </View>
        <View style={styles.progressLabels}>
          {schedule.phases.map((phase) => (
            <Text
              key={phase.phase}
              style={[
                styles.progressPhaseLabel,
                phase.phase === schedule.current_phase && styles.progressPhaseLabelActive,
                phase.phase < schedule.current_phase && styles.progressPhaseLabelDone,
              ]}
            >
              P{phase.phase}
            </Text>
          ))}
        </View>
      </View>

      {/* Next phase info or completion */}
      {isFinalPhase ? (
        <View style={styles.finalPhaseNote}>
          <Text style={styles.finalPhaseText}>
            {'\u2705'} You&apos;re at your target dose! Keep it up.
          </Text>
        </View>
      ) : (
        <View style={styles.nextPhaseSection}>
          <View style={styles.nextPhaseInfo}>
            <Text style={styles.nextPhaseLabel}>Next: {nextPhase.label}</Text>
            {daysRemaining != null && daysRemaining > 0 ? (
              <Text style={styles.nextPhaseTiming}>
                Eligible in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
              </Text>
            ) : (
              <Text style={styles.nextPhaseReady}>Ready to advance!</Text>
            )}
          </View>
          <PixelButton
            title="Advance"
            onPress={handleAdvance}
            variant={daysRemaining != null && daysRemaining > 0 ? 'outline' : undefined}
          />
        </View>
      )}
    </PixelCard>
  );
}

/** Default metformin phasing schedule */
export function createMetforminPhaseSchedule(startDate?: string): SupplementPhaseSchedule {
  const start = startDate ?? toDateKey(new Date());
  return {
    phases: [
      { phase: 1, label: '500mg x1/day', dosage: '500mg', frequency: 'once daily', duration_weeks: 2 },
      { phase: 2, label: '500mg x2/day', dosage: '500mg x2', frequency: 'twice daily', duration_weeks: 2 },
      { phase: 3, label: '500mg x4/day (2000mg)', dosage: '500mg x4', frequency: 'four times daily', duration_weeks: null },
    ],
    current_phase: 1,
    phase_started_at: start,
    start_date: start,
  };
}

const styles = StyleSheet.create({
  header: {
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.textPrimary,
  },
  currentPhase: {
    backgroundColor: Colors.softPurple,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  phaseLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.purple,
    fontWeight: '600',
  },
  phaseMeta: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  progressSection: {
    marginBottom: Spacing.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.full,
    overflow: 'visible',
    position: 'relative',
  },
  progressFill: {
    height: 8,
    backgroundColor: Colors.purple,
    borderRadius: BorderRadius.full,
    minWidth: 8,
  },
  phaseMarker: {
    position: 'absolute',
    top: -2,
    width: 2,
    height: 12,
    backgroundColor: Colors.textMuted,
    marginLeft: -1,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.xs,
  },
  progressPhaseLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
  },
  progressPhaseLabelActive: {
    color: Colors.purple,
    fontWeight: '600',
  },
  progressPhaseLabelDone: {
    color: Colors.textSecondary,
  },
  nextPhaseSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextPhaseInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  nextPhaseLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
  },
  nextPhaseTiming: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  nextPhaseReady: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.purple,
    fontWeight: '600',
    marginTop: 2,
  },
  finalPhaseNote: {
    backgroundColor: Colors.mint,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  finalPhaseText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
});
