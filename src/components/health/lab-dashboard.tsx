import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PixelCard, PixelButton } from '../ui';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useLabs } from '../../hooks/use-labs';
import { LAB_CATEGORIES, CATEGORY_ORDER, computeLabStatus } from '../../constants/lab-categories';
import { getTestComparison, generateLabInsights } from '../../utils/lab-insights';
import { LabEntryForm } from './lab-entry-form';
import { LabTrendChart } from './lab-trend-chart';
import { LabReport } from './lab-report';
import type { HealthLab } from '../../types/database';

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'high' || status === 'low'
      ? Colors.error
      : status === 'borderline'
        ? Colors.warning
        : Colors.success;
  return <View style={[styles.statusDot, { backgroundColor: color }]} />;
}

function TrendArrow({ current, previous }: { current: HealthLab; previous: HealthLab | null }) {
  if (!previous) return <Text style={styles.trendNew}>NEW</Text>;

  const diff = current.value - previous.value;
  const pctChange = previous.value !== 0 ? Math.abs((diff / previous.value) * 100) : 0;

  if (pctChange < 2) return <Text style={styles.trendFlat}>→</Text>;
  if (diff > 0) return <Text style={styles.trendUp}>↑</Text>;
  return <Text style={styles.trendDown}>↓</Text>;
}

function daysSince(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  const days = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}yr ago`;
}

function LabCard({
  lab,
  previous,
  onPress,
}: {
  lab: HealthLab;
  previous: HealthLab | null;
  onPress: () => void;
}) {
  const status = computeLabStatus(
    lab.value,
    lab.reference_range_low,
    lab.reference_range_high,
  );

  return (
    <TouchableOpacity style={styles.labCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.labCardTop}>
        <StatusDot status={status} />
        <Text style={styles.labCardName} numberOfLines={1}>
          {lab.test_name}
        </Text>
        <TrendArrow current={lab} previous={previous} />
      </View>
      <View style={styles.labCardBottom}>
        <Text style={[styles.labCardValue, status !== 'normal' && styles.labCardValueFlag]}>
          {lab.value} <Text style={styles.labCardUnit}>{lab.unit}</Text>
        </Text>
        <Text style={styles.labCardDate}>{daysSince(lab.test_date)}</Text>
      </View>
    </TouchableOpacity>
  );
}

type ViewMode = 'dashboard' | 'addForm' | 'chart' | 'report';

export function LabDashboard() {
  const { labs, latestByTest, labsByCategory, getPreviousResult, loading } = useLabs();
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const handleTestPress = useCallback((testName: string) => {
    setSelectedTest(testName);
    setViewMode('chart');
  }, []);

  const insights = generateLabInsights(labs);

  if (loading) return null;

  return (
    <PixelCard>
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
        style={styles.header}
      >
        <Text style={styles.title}>🔬 Labs</Text>
        <View style={styles.headerRight}>
          {latestByTest.length > 0 && (
            <Text style={styles.countBadge}>{latestByTest.length}</Text>
          )}
          <Text style={styles.collapseIcon}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {!expanded && latestByTest.length > 0 && (
        <Text style={styles.collapsedSummary}>
          {latestByTest.length} test{latestByTest.length !== 1 ? 's' : ''} tracked
          {labs.filter((l) => l.is_flagged).length > 0 &&
            ` · ⚠️ ${labs.filter((l) => l.is_flagged).length} flagged`}
        </Text>
      )}

      {expanded && (
        <View style={styles.content}>
          {/* Action Buttons */}
          <View style={styles.actions}>
            <PixelButton
              title={viewMode === 'addForm' ? '← Back' : '+ Add Results'}
              variant={viewMode === 'addForm' ? 'outline' : 'primary'}
              onPress={() => setViewMode(viewMode === 'addForm' ? 'dashboard' : 'addForm')}
            />
            {latestByTest.length > 0 && viewMode === 'dashboard' && (
              <PixelButton
                title="📋 Report"
                variant="outline"
                onPress={() => setViewMode('report')}
              />
            )}
            {viewMode === 'report' && (
              <PixelButton title="← Back" variant="outline" onPress={() => setViewMode('dashboard')} />
            )}
            {viewMode === 'chart' && (
              <PixelButton title="← Back" variant="outline" onPress={() => setViewMode('dashboard')} />
            )}
          </View>

          {/* Add Form */}
          {viewMode === 'addForm' && (
            <LabEntryForm onDone={() => setViewMode('dashboard')} />
          )}

          {/* Chart View */}
          {viewMode === 'chart' && selectedTest && (
            <LabTrendChart testName={selectedTest} />
          )}

          {/* Report View */}
          {viewMode === 'report' && <LabReport />}

          {/* Dashboard */}
          {viewMode === 'dashboard' && (
            <>
              {/* Insights */}
              {insights.length > 0 && (
                <View style={styles.insightsContainer}>
                  {insights.slice(0, 3).map((insight, i) => (
                    <View
                      key={i}
                      style={[
                        styles.insightCard,
                        insight.type === 'improved' && styles.insightImproved,
                        insight.type === 'attention' && styles.insightAttention,
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

              {/* Import note */}
              {latestByTest.length > 0 && (
                <Text style={styles.importNote}>
                  These labs were imported from your health spreadsheet. Add more from your next lab visit!
                </Text>
              )}

              {/* Labs by Category */}
              {CATEGORY_ORDER.map((catKey) => {
                const cat = LAB_CATEGORIES[catKey];
                const catLabs = labsByCategory[catKey] ?? [];
                return (
                  <View key={catKey} style={styles.categorySection}>
                    <Text style={styles.categoryTitle}>
                      {cat.emoji} {cat.label}
                    </Text>
                    {catLabs.length > 0 ? (
                      <View style={styles.labGrid}>
                        {catLabs.map((lab) => (
                          <LabCard
                            key={lab.id}
                            lab={lab}
                            previous={getPreviousResult(lab.test_name)}
                            onPress={() => handleTestPress(lab.test_name)}
                          />
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.emptyCategoryText}>
                        No results yet — add labs
                      </Text>
                    )}
                  </View>
                );
              })}

              {/* General/uncategorized */}
              {labsByCategory['general']?.length ? (
                <View style={styles.categorySection}>
                  <Text style={styles.categoryTitle}>📋 Other</Text>
                  <View style={styles.labGrid}>
                    {labsByCategory['general'].map((lab) => (
                      <LabCard
                        key={lab.id}
                        lab={lab}
                        previous={getPreviousResult(lab.test_name)}
                        onPress={() => handleTestPress(lab.test_name)}
                      />
                    ))}
                  </View>
                </View>
              ) : null}

              {latestByTest.length === 0 && (
                <Text style={styles.emptyText}>
                  No lab results yet. Tap &quot;+ Add Results&quot; to log your first labs!
                </Text>
              )}
            </>
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
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.textPrimary,
  },
  countBadge: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.purple,
    backgroundColor: 'rgba(124, 77, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BorderRadius.full,
  },
  collapseIcon: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
  },
  collapsedSummary: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  content: {
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  insightsContainer: {
    gap: Spacing.sm,
  },
  insightCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.info,
  },
  insightImproved: {
    borderLeftColor: Colors.success,
    backgroundColor: 'rgba(129, 199, 132, 0.08)',
  },
  insightAttention: {
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
  categorySection: {
    gap: Spacing.sm,
  },
  categoryTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.purple,
  },
  labGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  labCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    minWidth: 140,
    flex: 1,
    maxWidth: '48%',
  },
  labCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  labCardName: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textPrimary,
    flex: 1,
  },
  labCardBottom: {
    marginTop: Spacing.xs,
  },
  labCardValue: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.purple,
  },
  labCardValueFlag: {
    color: Colors.error,
  },
  labCardUnit: {
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
  },
  labCardDate: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
  },
  trendNew: {
    fontFamily: Fonts.body,
    fontSize: 8,
    color: Colors.info,
  },
  trendFlat: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
  },
  trendUp: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.error,
  },
  trendDown: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.success,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  emptyCategoryText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: Spacing.xs,
  },
  importNote: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: 'rgba(124, 77, 255, 0.04)',
    borderRadius: BorderRadius.md,
  },
});
