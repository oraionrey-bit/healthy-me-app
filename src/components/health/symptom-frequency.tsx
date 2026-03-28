import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { HealthCard, EmptyState } from './health-card';
import type { SymptomFrequency as SymptomFrequencyType } from '../../hooks/use-health-trends';

interface Props {
  data: SymptomFrequencyType[];
}

export const SymptomFrequencyCard = React.memo(function SymptomFrequencyCard({ data }: Props) {
  const top5 = data.slice(0, 5);
  const maxCount = top5.length > 0 ? top5[0].count : 1;

  return (
    <HealthCard title="🤒 Top Symptoms" borderColor={Colors.warning}>
      {top5.length === 0 ? (
        <EmptyState message="Log symptoms from Home to see patterns! 🤒" />
      ) : (
        <View style={styles.list}>
          {top5.map((symptom) => (
            <View key={symptom.key} style={styles.row}>
              <Text style={styles.label} numberOfLines={1}>
                {symptom.name}
              </Text>
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    {
                      width: `${Math.max(8, (symptom.count / maxCount) * 100)}%`,
                      opacity: 0.5 + (symptom.avgSeverity / 5) * 0.5,
                    },
                  ]}
                />
              </View>
              <Text style={styles.count}>{symptom.count}d</Text>
            </View>
          ))}
          {top5.length > 0 && (
            <Text style={styles.summary}>
              Most common: {top5[0].name} ({top5[0].count} days)
            </Text>
          )}
        </View>
      )}
    </HealthCard>
  );
});

const styles = StyleSheet.create({
  list: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  label: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textPrimary,
    width: 72,
  },
  barContainer: {
    flex: 1,
    height: 14,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: Colors.purple,
    borderRadius: BorderRadius.sm,
  },
  count: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    width: 28,
    textAlign: 'right',
  },
  summary: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
