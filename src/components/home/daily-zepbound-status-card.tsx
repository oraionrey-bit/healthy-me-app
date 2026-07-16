import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useZepbound } from '../../hooks/use-zepbound';
import { toDateKey } from '../../utils/storage';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../../constants/theme';

export function DailyZepboundStatusCard({ date }: { date: Date }) {
  const router = useRouter();
  const { injections, symptoms, loading, lastInjection, nextInjectionDate } = useZepbound();
  const dateKey = useMemo(() => toDateKey(date), [date]);
  const shotsForDay = injections.filter((item) => item.injection_date === dateKey);
  const symptomsForDay = symptoms.filter((item) => item.log_date === dateKey);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>💉 Zepbound</Text>
        <TouchableOpacity onPress={() => router.push('/health')} activeOpacity={0.7}>
          <Text style={styles.openText}>Open tracker ›</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator color={Colors.purple} />
      ) : shotsForDay.length > 0 || symptomsForDay.length > 0 ? (
        <View style={styles.statusWrap}>
          {shotsForDay.map((shot) => (
            <Text key={shot.id} style={styles.statusText}>
              ✓ Shot {shot.dose_mg} mg at {shot.injection_time.slice(0, 5)}
            </Text>
          ))}
          {symptomsForDay.map((symptom) => (
            <Text key={symptom.id} style={styles.statusText}>
              {symptom.symptom_type} · {symptom.severity}/5
            </Text>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText}>
          {lastInjection && nextInjectionDate
            ? `Last shot ${lastInjection.injection_date} · next weekly date ${toDateKey(nextInjectionDate)}`
            : 'No Zepbound activity for this day.'}
        </Text>
      )}
      <Text style={styles.hint}>Shots and related symptoms are entered once in Health.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.babyBlue,
    padding: Spacing.md,
    ...Shadows.card,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: Fonts.body, fontSize: FontSizes.bodyLg, color: Colors.textPrimary },
  openText: { fontFamily: Fonts.body, fontSize: FontSizes.bodyXs, color: Colors.purple },
  statusWrap: { gap: Spacing.xs, marginTop: Spacing.sm },
  statusText: { fontFamily: Fonts.body, fontSize: FontSizes.bodySm, color: Colors.textPrimary },
  emptyText: { fontFamily: Fonts.body, fontSize: FontSizes.bodySm, color: Colors.textSecondary, marginTop: Spacing.sm },
  hint: { fontFamily: Fonts.body, fontSize: FontSizes.bodyXs, color: Colors.textMuted, marginTop: Spacing.sm },
});
