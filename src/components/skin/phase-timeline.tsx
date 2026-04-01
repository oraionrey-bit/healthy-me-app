import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { PixelCard } from '../ui';
import type { Phase } from '../../types/skin-plan';

interface PhaseTimelineProps {
  phases: Phase[];
  activePhaseIndex: number;
  progress: { daysIn: number; totalDays: number; percent: number };
}

const STATUS_ICON: Record<string, string> = {
  completed: '✅',
  active: '●',
  upcoming: '○',
  skipped: '⊘',
};

export function PhaseTimeline({ phases, activePhaseIndex, progress }: PhaseTimelineProps) {
  return (
    <PixelCard>
      <Text style={styles.title}>📋 Plan Phases</Text>
      <View style={styles.timeline}>
        {phases.map((phase, i) => {
          const isActive = i === activePhaseIndex;
          const isCompleted = phase.status === 'completed';
          return (
            <View key={phase.id} style={styles.phaseRow}>
              {/* Connector line */}
              {i > 0 && (
                <View
                  style={[
                    styles.connector,
                    isCompleted || isActive ? styles.connectorDone : styles.connectorPending,
                  ]}
                />
              )}
              {/* Icon + content */}
              <View style={styles.phaseContent}>
                <View style={styles.iconRow}>
                  <Text style={[styles.icon, isActive && styles.iconActive]}>
                    {STATUS_ICON[phase.status] ?? '○'}
                  </Text>
                  <View style={styles.phaseInfo}>
                    <Text
                      style={[
                        styles.phaseName,
                        isActive && styles.phaseNameActive,
                        isCompleted && styles.phaseNameDone,
                      ]}
                    >
                      {phase.name}
                    </Text>
                    <Text style={styles.phaseGoal}>{phase.goal}</Text>
                  </View>
                </View>

                {/* Expanded active phase */}
                {isActive && (
                  <View style={styles.activeDetail}>
                    <View style={styles.progressBarBg}>
                      <View
                        style={[styles.progressBarFill, { width: `${progress.percent}%` }]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      Day {progress.daysIn} of ~{progress.totalDays} ({progress.percent}%)
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
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
  timeline: {
    gap: Spacing.xs,
  },
  phaseRow: {
    position: 'relative',
  },
  connector: {
    position: 'absolute',
    left: 9,
    top: -8,
    width: 2,
    height: 8,
  },
  connectorDone: {
    backgroundColor: Colors.success,
  },
  connectorPending: {
    backgroundColor: Colors.tabBarBorder,
  },
  phaseContent: {
    paddingLeft: 0,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  icon: {
    fontSize: 16,
    marginTop: 2,
    color: Colors.textMuted,
  },
  iconActive: {
    color: Colors.purple,
    fontSize: 18,
  },
  phaseInfo: {
    flex: 1,
  },
  phaseName: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
  },
  phaseNameActive: {
    color: Colors.purple,
    fontFamily: Fonts.body,
  },
  phaseNameDone: {
    color: Colors.textMuted,
  },
  phaseGoal: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  activeDetail: {
    marginTop: Spacing.sm,
    marginLeft: 28,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.tabBarBorder,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.purple,
  },
  progressText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
});
