import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { PixelCard } from '../ui';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useLabs } from '../../hooks/use-labs';
import type { HealthLab } from '../../types/database';

/** Simple SVG-free sparkline using View bars */
function MiniTrend({ values, refLow, refHigh }: { values: number[]; refLow: number | null; refHigh: number | null }) {
  if (values.length < 2) return null;

  const min = Math.min(...values, refLow ?? Infinity);
  const max = Math.max(...values, refHigh ?? -Infinity);
  const range = max - min || 1;
  const barHeight = 40;

  return (
    <View style={trendStyles.sparkline}>
      {values.map((v, i) => {
        const pct = ((v - min) / range) * 100;
        const isOut = (refLow != null && v < refLow) || (refHigh != null && v > refHigh);
        return (
          <View key={i} style={trendStyles.sparkCol}>
            <View
              style={[
                trendStyles.sparkBar,
                {
                  height: Math.max(4, (pct / 100) * barHeight),
                  backgroundColor: isOut ? Colors.error : Colors.purple,
                },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

function TrendArrow({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const latest = values[values.length - 1];
  const previous = values[values.length - 2];
  const diff = latest - previous;
  const pctChange = previous !== 0 ? Math.abs((diff / previous) * 100) : 0;

  if (Math.abs(diff) < 0.01) {
    return <Text style={trendStyles.trendFlat}>→ stable</Text>;
  }

  return (
    <Text style={diff > 0 ? trendStyles.trendUp : trendStyles.trendDown}>
      {diff > 0 ? '↑' : '↓'} {pctChange.toFixed(1)}%
    </Text>
  );
}

function LabTestCard({ testName, history }: { testName: string; history: HealthLab[] }) {
  const [showAll, setShowAll] = useState(false);
  const latest = history[history.length - 1];
  const values = history.map((h) => h.value);
  const refLow = latest.reference_range_low;
  const refHigh = latest.reference_range_high;

  const refRangeText = [
    refLow != null ? String(refLow) : '',
    refHigh != null ? String(refHigh) : '',
  ]
    .filter(Boolean)
    .join(' – ');

  return (
    <View style={trendStyles.testCard}>
      <TouchableOpacity
        onPress={() => setShowAll(!showAll)}
        activeOpacity={0.7}
        style={trendStyles.testHeader}
      >
        <View style={trendStyles.testNameCol}>
          <Text style={trendStyles.testName}>{testName}</Text>
          <Text style={trendStyles.testMeta}>
            {history.length} result{history.length !== 1 ? 's' : ''}
            {refRangeText ? ` · Ref: ${refRangeText} ${latest.unit}` : ''}
          </Text>
        </View>
        <View style={trendStyles.testValueCol}>
          <Text style={[trendStyles.latestValue, latest.is_flagged && trendStyles.flaggedValue]}>
            {latest.value} {latest.unit}
          </Text>
          <TrendArrow values={values} />
        </View>
      </TouchableOpacity>

      {history.length >= 2 && (
        <MiniTrend values={values} refLow={refLow} refHigh={refHigh} />
      )}

      {showAll && (
        <View style={trendStyles.historyList}>
          {history.map((h) => (
            <View key={h.id} style={trendStyles.historyRow}>
              <Text style={trendStyles.historyDate}>
                {new Date(h.test_date + 'T00:00:00').toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: '2-digit',
                })}
              </Text>
              <Text style={[trendStyles.historyValue, h.is_flagged && trendStyles.flaggedValue]}>
                {h.value} {h.unit}
              </Text>
              {h.notes && <Text style={trendStyles.historyNotes}>{h.notes}</Text>}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function LabTrends() {
  const { testNames, getTestHistory, labs, loading } = useLabs();
  const [expanded, setExpanded] = useState(false);

  if (loading || labs.length === 0) return null;

  // Group tests by category using the common lab tests reference
  const testsWithHistory = testNames
    .map((name) => ({
      name,
      history: getTestHistory(name),
    }))
    .filter((t) => t.history.length > 0);

  return (
    <PixelCard>
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
        style={trendStyles.header}
      >
        <Text style={trendStyles.title}>📈 Lab Trends</Text>
        <Text style={trendStyles.collapseIcon}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {!expanded && (
        <Text style={trendStyles.summary}>
          {testsWithHistory.length} test{testsWithHistory.length !== 1 ? 's' : ''} tracked
          {testsWithHistory.filter((t) => t.history.length >= 2).length > 0 &&
            ` · ${testsWithHistory.filter((t) => t.history.length >= 2).length} with trends`}
        </Text>
      )}

      {expanded && (
        <View style={trendStyles.testsList}>
          {testsWithHistory.map(({ name, history }) => (
            <LabTestCard key={name} testName={name} history={history} />
          ))}
        </View>
      )}
    </PixelCard>
  );
}

const trendStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  summary: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  testsList: {
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  testCard: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.tabBarBorder,
    paddingBottom: Spacing.md,
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  testNameCol: {
    flex: 1,
  },
  testName: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
  },
  testMeta: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  testValueCol: {
    alignItems: 'flex-end',
  },
  latestValue: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.purple,
  },
  flaggedValue: {
    color: Colors.error,
  },
  trendUp: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.error,
  },
  trendDown: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.success,
  },
  trendFlat: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
  },
  sparkline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    marginTop: Spacing.sm,
    height: 40,
  },
  sparkCol: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sparkBar: {
    borderRadius: 2,
    minWidth: 4,
  },
  historyList: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
    paddingLeft: Spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: Colors.tabBarBorder,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  historyDate: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    width: 65,
  },
  historyValue: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
  },
  historyNotes: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    flex: 1,
  },
});
