import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { PixelCard } from '../ui';
import type { TesterSummary } from '../../hooks/use-skincare';

interface TesterPerformanceProps {
  testers: TesterSummary[];
  onMarkSafe?: (productId: string) => void;
  onMarkTrigger?: (productId: string) => void;
}

const REACTION_EMOJI: Record<string, string> = {
  good: '👍',
  neutral: '😐',
  bad: '👎',
  none: '·',
};

function RatioBar({ goodPercent, badPercent }: { goodPercent: number; badPercent: number }) {
  const neutralPercent = Math.max(0, 100 - goodPercent - badPercent);

  return (
    <View style={styles.ratioBar}>
      {goodPercent > 0 && (
        <View style={[styles.ratioSegment, styles.ratioGood, { flex: goodPercent }]} />
      )}
      {neutralPercent > 0 && (
        <View style={[styles.ratioSegment, styles.ratioNeutral, { flex: neutralPercent }]} />
      )}
      {badPercent > 0 && (
        <View style={[styles.ratioSegment, styles.ratioBad, { flex: badPercent }]} />
      )}
    </View>
  );
}

function TesterRow({
  tester,
  onMarkSafe,
  onMarkTrigger,
}: {
  tester: TesterSummary;
  onMarkSafe?: (productId: string) => void;
  onMarkTrigger?: (productId: string) => void;
}) {
  return (
    <View style={styles.testerRow}>
      <View style={styles.testerHeader}>
        <Text style={styles.productName} numberOfLines={1}>
          {tester.productName}
        </Text>
        <View style={styles.dayBadge}>
          <Text style={styles.dayBadgeText}>Day {tester.dayCount}</Text>
        </View>
      </View>

      <View style={styles.emojiRow}>
        {tester.last7Days.map((status, i) => (
          <Text key={i} style={[styles.emojiDay, status === 'none' && styles.emojiNone]}>
            {REACTION_EMOJI[status]}
          </Text>
        ))}
        <Text style={styles.logCount}>{tester.totalLogs} logs</Text>
      </View>

      <RatioBar goodPercent={tester.goodPercent} badPercent={tester.badPercent} />

      {tester.suggestion === 'consider-safe' && onMarkSafe && (
        <TouchableOpacity
          style={styles.suggestionRow}
          onPress={() => onMarkSafe(tester.productId)}
          activeOpacity={0.7}
        >
          <Text style={styles.suggestionSafe}>Looks good — mark safe?</Text>
        </TouchableOpacity>
      )}
      {tester.suggestion === 'consider-trigger' && onMarkTrigger && (
        <TouchableOpacity
          style={styles.suggestionRow}
          onPress={() => onMarkTrigger(tester.productId)}
          activeOpacity={0.7}
        >
          <Text style={styles.suggestionTrigger}>Causing issues — mark trigger?</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function TesterPerformanceCard({
  testers,
  onMarkSafe,
  onMarkTrigger,
}: TesterPerformanceProps) {
  return (
    <PixelCard>
      <Text style={styles.title}>🧪 Tester Performance</Text>
      {testers.length === 0 ? (
        <Text style={styles.emptyText}>No products being tested</Text>
      ) : (
        testers.map((tester) => (
          <TesterRow
            key={tester.productId}
            tester={tester}
            onMarkSafe={onMarkSafe}
            onMarkTrigger={onMarkTrigger}
          />
        ))
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
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  testerRow: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  testerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  productName: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: Spacing.sm,
  },
  dayBadge: {
    backgroundColor: 'rgba(124, 77, 255, 0.12)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  dayBadgeText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.purple,
  },
  emojiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  emojiDay: {
    fontSize: FontSizes.bodyLg,
  },
  emojiNone: {
    fontSize: FontSizes.bodyLg,
    color: Colors.textMuted,
  },
  logCount: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    marginLeft: 'auto',
  },
  ratioBar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    backgroundColor: Colors.tabBarBorder,
  },
  ratioSegment: {
    height: '100%',
  },
  ratioGood: {
    backgroundColor: Colors.success,
  },
  ratioNeutral: {
    backgroundColor: Colors.warning,
  },
  ratioBad: {
    backgroundColor: Colors.error,
  },
  suggestionRow: {
    marginTop: Spacing.sm,
  },
  suggestionSafe: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.success,
  },
  suggestionTrigger: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.error,
  },
});
