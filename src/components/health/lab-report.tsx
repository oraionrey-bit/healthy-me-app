import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useLabs } from '../../hooks/use-labs';
import { LAB_CATEGORIES, CATEGORY_ORDER, computeLabStatus } from '../../constants/lab-categories';
import { generateLabInsights, getTestComparison } from '../../utils/lab-insights';
import { format } from 'date-fns';

function StatusBadge({ status }: { status: string }) {
  const config = {
    normal: { bg: 'rgba(129, 199, 132, 0.15)', color: Colors.success, text: '● Normal' },
    high: { bg: 'rgba(229, 115, 115, 0.15)', color: Colors.error, text: '▲ High' },
    low: { bg: 'rgba(229, 115, 115, 0.15)', color: Colors.error, text: '▼ Low' },
    borderline: { bg: 'rgba(255, 183, 77, 0.15)', color: Colors.warning, text: '◆ Borderline' },
  }[status] ?? { bg: Colors.background, color: Colors.textMuted, text: status };

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.badgeText, { color: config.color }]}>{config.text}</Text>
    </View>
  );
}

export function LabReport() {
  const { labs, latestByTest, labsByCategory, getPreviousResult } = useLabs();
  const insights = generateLabInsights(labs);

  if (latestByTest.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No lab results to report.</Text>
      </View>
    );
  }

  const latestDate = latestByTest.reduce(
    (max, lab) => (lab.test_date > max ? lab.test_date : max),
    latestByTest[0].test_date,
  );

  return (
    <View style={styles.container}>
      {/* Report Header */}
      <View style={styles.reportHeader}>
        <Text style={styles.reportTitle}>Lab Report</Text>
        <Text style={styles.reportDate}>
          Most recent: {format(new Date(latestDate + 'T00:00:00'), 'MMM d, yyyy')}
        </Text>
        <Text style={styles.reportSummary}>
          {latestByTest.length} tests · {labs.filter((l) => l.is_flagged).length} flagged
        </Text>
      </View>

      {/* Results by Category */}
      {CATEGORY_ORDER.filter((key) => labsByCategory[key]?.length).map((catKey) => {
        const cat = LAB_CATEGORIES[catKey];
        const catLabs = labsByCategory[catKey] ?? [];
        return (
          <View key={catKey} style={styles.section}>
            <Text style={styles.sectionTitle}>
              {cat.emoji} {cat.label}
            </Text>
            {catLabs.map((lab) => {
              const status = computeLabStatus(
                lab.value,
                lab.reference_range_low,
                lab.reference_range_high,
              );
              const prev = getPreviousResult(lab.test_name);
              const comparison = getTestComparison(
                lab.value,
                prev?.value ?? null,
                lab.reference_range_high,
                lab.reference_range_low,
              );

              return (
                <View key={lab.id} style={styles.resultRow}>
                  <View style={styles.resultLeft}>
                    <Text style={styles.resultName}>{lab.test_name}</Text>
                    <Text style={styles.resultRef}>
                      {lab.reference_range_low != null && lab.reference_range_high != null
                        ? `Ref: ${lab.reference_range_low}–${lab.reference_range_high} ${lab.unit}`
                        : ''}
                    </Text>
                  </View>
                  <View style={styles.resultRight}>
                    <Text
                      style={[
                        styles.resultValue,
                        status !== 'normal' && status !== 'borderline' && styles.resultValueFlag,
                      ]}
                    >
                      {lab.value} {lab.unit}
                    </Text>
                    <StatusBadge status={status} />
                    <Text
                      style={[
                        styles.comparison,
                        comparison.type === 'improved' && styles.comparisonGood,
                        comparison.type === 'attention' && styles.comparisonBad,
                      ]}
                    >
                      {comparison.emoji} {comparison.label}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}

      {/* General/uncategorized */}
      {labsByCategory['general']?.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Other</Text>
          {labsByCategory['general'].map((lab) => {
            const status = computeLabStatus(
              lab.value,
              lab.reference_range_low,
              lab.reference_range_high,
            );
            return (
              <View key={lab.id} style={styles.resultRow}>
                <View style={styles.resultLeft}>
                  <Text style={styles.resultName}>{lab.test_name}</Text>
                </View>
                <View style={styles.resultRight}>
                  <Text style={styles.resultValue}>
                    {lab.value} {lab.unit}
                  </Text>
                  <StatusBadge status={status} />
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* PCOS Insights */}
      {insights.length > 0 && (
        <View style={styles.insightsSection}>
          <Text style={styles.sectionTitle}>💜 PCOS Insights</Text>
          {insights.map((insight, i) => (
            <View
              key={i}
              style={[
                styles.insightCard,
                insight.type === 'improved' && styles.insightGood,
                insight.type === 'attention' && styles.insightBad,
              ]}
            >
              <Text style={styles.insightTitle}>
                {insight.emoji} {insight.title}
              </Text>
              <Text style={styles.insightMsg}>{insight.message}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  emptyContainer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
  },
  reportHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.tabBarBorder,
  },
  reportTitle: {
    fontFamily: Fonts.pixel,
    fontSize: FontSizes.lg,
    color: Colors.purple,
  },
  reportDate: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  reportSummary: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  section: {
    gap: Spacing.xs,
  },
  sectionTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.purple,
    marginBottom: Spacing.xs,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.tabBarBorder,
  },
  resultLeft: {
    flex: 1,
  },
  resultName: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
  },
  resultRef: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
  },
  resultRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  resultValue: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
  },
  resultValueFlag: {
    color: Colors.error,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontFamily: Fonts.body,
    fontSize: 8,
  },
  comparison: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
  },
  comparisonGood: {
    color: Colors.success,
  },
  comparisonBad: {
    color: Colors.warning,
  },
  insightsSection: {
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.tabBarBorder,
  },
  insightCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.info,
  },
  insightGood: {
    borderLeftColor: Colors.success,
    backgroundColor: 'rgba(129, 199, 132, 0.08)',
  },
  insightBad: {
    borderLeftColor: Colors.warning,
    backgroundColor: 'rgba(255, 183, 77, 0.08)',
  },
  insightTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  insightMsg: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
});
