import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PixelCard } from '../ui';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useSupplementStreaks } from '../../hooks/use-supplement-streaks';

function AdherenceBar({ label, pct }: { label: string; pct: number }) {
  const barColor = pct >= 80 ? Colors.success : pct >= 50 ? Colors.warning : Colors.error;
  return (
    <View style={styles.adherenceRow}>
      <Text style={styles.adherenceLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.adherenceBarOuter}>
        <View style={[styles.adherenceBarInner, { width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={styles.adherencePct}>{pct}%</Text>
    </View>
  );
}

function MiniHeatmap({ dailyHistory }: { dailyHistory: Array<{ date: string; pct: number }> }) {
  const getColor = (pct: number) => {
    if (pct >= 100) return Colors.success;
    if (pct >= 75) return '#a5d6a7';
    if (pct >= 50) return Colors.warning;
    if (pct > 0) return '#ffcc80';
    return '#f0eaf8';
  };

  return (
    <View style={styles.heatmapRow}>
      {dailyHistory.map((day) => (
        <View
          key={day.date}
          style={[styles.heatmapCell, { backgroundColor: getColor(day.pct) }]}
        />
      ))}
    </View>
  );
}

export function SupplementStreakCard() {
  const { data, loading } = useSupplementStreaks();
  const [expanded, setExpanded] = useState(false);

  if (loading || !data) return null;

  return (
    <PixelCard>
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
        style={styles.header}
      >
        <Text style={styles.title}>💊 Supplement Consistency</Text>
        <Text style={styles.collapseIcon}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {/* Summary stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {data.currentStreak > 0 ? `🔥 ${data.currentStreak}` : '0'}
          </Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{data.weeklyAdherence}%</Text>
          <Text style={styles.statLabel}>7-Day</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{data.monthlyAdherence}%</Text>
          <Text style={styles.statLabel}>30-Day</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{data.perfectDays}</Text>
          <Text style={styles.statLabel}>Perfect</Text>
        </View>
      </View>

      {/* Mini heatmap — last 30 days */}
      <View style={styles.heatmapSection}>
        <Text style={styles.heatmapLabel}>Last 30 Days</Text>
        <MiniHeatmap dailyHistory={data.dailyHistory} />
      </View>

      {/* Expanded: per-supplement breakdown */}
      {expanded && (
        <View style={styles.expandedSection}>
          <Text style={styles.breakdownTitle}>Per-Supplement</Text>
          {data.perSupplement.map((supp) => (
            <AdherenceBar
              key={supp.supplementId}
              label={supp.name}
              pct={supp.adherencePct}
            />
          ))}
          {data.bestStreak > data.currentStreak && (
            <Text style={styles.bestStreak}>
              Best streak: {data.bestStreak} days
            </Text>
          )}
        </View>
      )}
    </PixelCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.purple,
  },
  statLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  heatmapSection: {
    gap: Spacing.xs,
  },
  heatmapLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
  },
  heatmapRow: {
    flexDirection: 'row',
    gap: 2,
    flexWrap: 'wrap',
  },
  heatmapCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  expandedSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.tabBarBorder,
    gap: Spacing.sm,
  },
  breakdownTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  adherenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  adherenceLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
    width: 90,
  },
  adherenceBarOuter: {
    flex: 1,
    height: 8,
    backgroundColor: '#f0eaf8',
    borderRadius: 4,
    overflow: 'hidden',
  },
  adherenceBarInner: {
    height: '100%',
    borderRadius: 4,
  },
  adherencePct: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textPrimary,
    width: 32,
    textAlign: 'right',
  },
  bestStreak: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
