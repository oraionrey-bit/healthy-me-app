/**
 * WeeklyInsightsCard — collapsible "💡 Weekly Insights" card.
 *
 * Extracted from src/app/(tabs)/index.tsx during the May 7 split
 * (bundle module 1201, line 98371). Same logic as the inline version —
 * just relocated for clarity.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import {
  Colors,
  Fonts,
  FontSizes,
  Spacing,
  BorderRadius,
} from '../../constants/theme';
import type { WeeklyInsightsData } from '../../hooks/use-weekly-insights';

interface WeeklyInsightsCardProps {
  data: WeeklyInsightsData;
  showInsights: boolean;
  setShowInsights: (v: boolean) => void;
}

function arrow(t: 'up' | 'down' | 'stable'): string {
  return t === 'up' ? '↑' : t === 'down' ? '↓' : '→';
}

export const WeeklyInsightsCard = React.memo(function WeeklyInsightsCard({
  data,
  showInsights,
  setShowInsights,
}: WeeklyInsightsCardProps) {
  return (
    <View style={[styles.accentCard, styles.accentPurple, { marginBottom: Spacing.lg }]}>
      <TouchableOpacity
        onPress={() => setShowInsights(!showInsights)}
        activeOpacity={0.7}
        style={styles.checkinHeader}
      >
        <Text style={styles.sectionTitle}>💡 Weekly Insights</Text>
        <Text style={styles.collapseIcon}>{showInsights ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {/* Always show key metrics row */}
      <View style={styles.insightsMetricsRow}>
        <View style={styles.insightMetric}>
          <Text style={styles.insightMetricValue}>{data.avgCalories}</Text>
          <Text style={styles.insightMetricLabel}>Avg Cal {arrow(data.calorieTrend)}</Text>
        </View>
        <View style={styles.insightMetric}>
          <Text style={styles.insightMetricValue}>{data.avgProtein}g</Text>
          <Text style={styles.insightMetricLabel}>Avg Prot {arrow(data.proteinTrend)}</Text>
        </View>
        {data.avgSleepScore !== null && (
          <View style={styles.insightMetric}>
            <Text style={styles.insightMetricValue}>{Math.round(data.avgSleepScore)}</Text>
            <Text style={styles.insightMetricLabel}>Sleep {arrow(data.sleepTrend)}</Text>
          </View>
        )}
        <View style={styles.insightMetric}>
          <Text style={styles.insightMetricValue}>{data.supplementAdherencePct}%</Text>
          <Text style={styles.insightMetricLabel}>Supps</Text>
        </View>
      </View>

      {showInsights && (
        <View style={styles.insightsList}>
          {data.insights.map((insight, idx) => (
            <View key={idx} style={styles.insightItem}>
              <Text style={styles.insightEmoji}>{insight.emoji}</Text>
              <Text style={styles.insightText}>{insight.text}</Text>
            </View>
          ))}
        </View>
      )}

      {!showInsights && (
        <TouchableOpacity onPress={() => setShowInsights(true)}>
          <Text style={styles.viewInsightsBtn}>View This Week&apos;s Insights</Text>
        </TouchableOpacity>
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
  accentPurple: { borderLeftColor: Colors.purple },
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
  insightsMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  insightMetric: {
    flex: 1,
    alignItems: 'center',
  },
  insightMetricValue: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.purple,
  },
  insightMetricLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  insightsList: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: 'rgba(124, 77, 255, 0.06)',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  insightEmoji: {
    fontSize: 18,
    marginTop: 1,
  },
  insightText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
    flex: 1,
  },
  viewInsightsBtn: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.purple,
    textAlign: 'center',
    marginTop: Spacing.sm,
    opacity: 0.8,
  },
});
