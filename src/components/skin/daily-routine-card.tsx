import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { PixelCard } from '../ui';
import type { RoutineStep } from '../../types/skin-plan';
import { isProductScheduled } from '../../types/skin-plan';

interface DailyRoutineCardProps {
  amSteps: RoutineStep[];
  pmSteps: RoutineStep[];
  phaseStartDate: string | null;
}

function FrequencyBadge({ step, phaseStartDate }: { step: RoutineStep; phaseStartDate: string | null }) {
  if (step.frequency === 'daily') return null;

  if (step.frequency === 'every-other-day') {
    const isOn = isProductScheduled(step, new Date(), phaseStartDate);
    return (
      <View style={[styles.freqBadge, isOn ? styles.freqOn : styles.freqOff]}>
        <Text style={[styles.freqText, isOn ? styles.freqTextOn : styles.freqTextOff]}>
          {isOn ? 'Tonight: ON ✅' : 'Rest night 😴'}
        </Text>
      </View>
    );
  }

  const labels: Record<string, string> = {
    '2x-week': '2×/week',
    '3x-week': '3×/week',
    weekly: 'Weekly',
  };
  return (
    <View style={styles.freqBadge}>
      <Text style={styles.freqText}>{labels[step.frequency] ?? step.frequency}</Text>
    </View>
  );
}

function RoutineSection({
  title,
  steps,
  checked,
  onToggle,
  phaseStartDate,
}: {
  title: string;
  steps: RoutineStep[];
  checked: Map<string, boolean>;
  onToggle: (id: string) => void;
  phaseStartDate: string | null;
}) {
  const doneCount = steps.filter((s) => checked.get(s.id)).length;
  const allDone = doneCount === steps.length && steps.length > 0;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={[styles.counter, allDone && styles.counterDone]}>
          {doneCount}/{steps.length}
        </Text>
      </View>
      {steps.map((step) => {
        const done = checked.get(step.id) ?? false;
        return (
          <TouchableOpacity key={step.id} onPress={() => onToggle(step.id)} activeOpacity={0.7}>
            <View style={[styles.stepRow, done && styles.stepRowDone]}>
              <View style={[styles.checkbox, done && styles.checkboxDone]}>
                {done && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.stepInfo}>
                <View style={styles.stepNameRow}>
                  <Text style={[styles.stepName, done && styles.stepNameDone]}>
                    {step.product.name}
                  </Text>
                  {step.isNew && (
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>✨ NEW</Text>
                    </View>
                  )}
                </View>
                <FrequencyBadge step={step} phaseStartDate={phaseStartDate} />
                {step.notes ? <Text style={styles.stepNotes}>{step.notes}</Text> : null}
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function DailyRoutineCard({ amSteps, pmSteps, phaseStartDate }: DailyRoutineCardProps) {
  const [checked, setChecked] = useState<Map<string, boolean>>(new Map());

  const onToggle = useCallback((id: string) => {
    setChecked((prev) => {
      const next = new Map(prev);
      next.set(id, !prev.get(id));
      return next;
    });
  }, []);

  if (amSteps.length === 0 && pmSteps.length === 0) {
    return (
      <PixelCard>
        <Text style={styles.emptyText}>No routine scheduled for today</Text>
      </PixelCard>
    );
  }

  return (
    <PixelCard>
      <Text style={styles.title}>🧴 Today&apos;s Routine</Text>
      {amSteps.length > 0 && (
        <RoutineSection
          title="☀️ AM Routine"
          steps={amSteps}
          checked={checked}
          onToggle={onToggle}
          phaseStartDate={phaseStartDate}
        />
      )}
      {pmSteps.length > 0 && (
        <RoutineSection
          title="🌙 PM Routine"
          steps={pmSteps}
          checked={checked}
          onToggle={onToggle}
          phaseStartDate={phaseStartDate}
        />
      )}
    </PixelCard>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  section: {
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textSecondary,
  },
  counter: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
  },
  counterDone: {
    color: Colors.success,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  stepRowDone: {
    backgroundColor: 'rgba(129, 199, 132, 0.08)',
    borderColor: 'rgba(129, 199, 132, 0.3)',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    marginTop: 2,
  },
  checkboxDone: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  checkmark: {
    fontFamily: Fonts.body,
    fontSize: 7,
    color: Colors.textOnDark,
  },
  stepInfo: {
    flex: 1,
  },
  stepNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  stepName: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
  },
  stepNameDone: {
    color: Colors.textSecondary,
  },
  newBadge: {
    backgroundColor: 'rgba(124, 77, 255, 0.12)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 1,
  },
  newBadgeText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.purple,
  },
  freqBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
  },
  freqOn: {
    backgroundColor: 'rgba(129, 199, 132, 0.1)',
    borderColor: 'rgba(129, 199, 132, 0.3)',
  },
  freqOff: {
    backgroundColor: 'rgba(176, 164, 192, 0.1)',
    borderColor: 'rgba(176, 164, 192, 0.3)',
  },
  freqText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
  },
  freqTextOn: {
    color: Colors.success,
  },
  freqTextOff: {
    color: Colors.textMuted,
  },
  stepNotes: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    marginTop: 4,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
});
