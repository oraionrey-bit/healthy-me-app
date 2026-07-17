import React, { useMemo } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { HealthCard } from './health-card';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useZepbound } from '../../hooks/use-zepbound';
import { formatDatabaseTime } from '../../utils/zepbound-time';

const webWrappingText: any = Platform.OS === 'web'
  ? { wordBreak: 'break-word' }
  : undefined;

/** Longitudinal review and correction surface; routine entry belongs on Home. */
export function ZepboundTrackerCard() {
  const {
    injections,
    symptoms,
    dailyCheckins,
    loading,
    nextInjectionDate,
    deleteInjection,
    deleteSymptom,
  } = useZepbound();

  const injectionIds = useMemo(() => new Set(injections.map((injection) => injection.id)), [injections]);
  const symptomsByInjection = useMemo(() => {
    const map = new Map<string, typeof symptoms>();
    for (const symptom of symptoms) {
      if (!symptom.injection_id) continue;
      map.set(symptom.injection_id, [...(map.get(symptom.injection_id) ?? []), symptom]);
    }
    return map;
  }, [symptoms]);
  const unassociatedSymptoms = useMemo(
    () => symptoms.filter((symptom) => !symptom.injection_id || !injectionIds.has(symptom.injection_id)),
    [symptoms, injectionIds],
  );

  return (
    <HealthCard title="💉 Zepbound history" borderColor={Colors.babyBlue}>
      <Text style={styles.helper}>Review weekly shots and symptoms here. Add new entries from Home.</Text>
      {nextInjectionDate && (
        <Text style={styles.nextDate}>
          Next weekly date: {nextInjectionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </Text>
      )}

      {loading ? (
        <ActivityIndicator color={Colors.purple} style={styles.loading} />
      ) : injections.length === 0 && symptoms.length === 0 && dailyCheckins.length === 0 ? (
        <Text style={styles.empty}>No Zepbound history logged yet. Start on Home.</Text>
      ) : (
        <View style={styles.timeline}>
          <Text style={styles.timelineTitle}>Shot and symptom history</Text>
          {injections.map((injection) => (
            <View key={injection.id} style={styles.historyItem}>
              <View style={styles.historyHeader}>
                <View>
                  <Text style={styles.historyPrimary}>{injection.injection_date} · {formatDatabaseTime(injection.injection_time)}</Text>
                  <Text style={styles.historySecondary}>
                    {injection.dose_mg} mg
                    {injection.injection_site !== 'other' ? ` · ${injection.injection_site.replace('_', ' ')}` : ''}
                  </Text>
                </View>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Delete shot from ${injection.injection_date}`} onPress={() => void deleteInjection(injection.id)}>
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
              {injection.notes && <Text style={styles.notes}>{injection.notes}</Text>}
              {(symptomsByInjection.get(injection.id) ?? []).map((symptom) => (
                <View key={symptom.id} style={styles.symptomRow}>
                  <View testID={`zepbound-health-symptom-content-${symptom.id}`} style={styles.symptomContent}>
                    <Text style={[styles.symptomText, webWrappingText]}>
                      {symptom.symptom_type === 'None' ? 'No symptoms' : `${symptom.symptom_type} · ${symptom.severity}/5`}
                    </Text>
                    <Text style={styles.historySecondary}>{symptom.log_date}</Text>
                    {symptom.notes && <Text style={[styles.notes, webWrappingText]}>{symptom.notes}</Text>}
                  </View>
                  <TouchableOpacity style={styles.deleteButton} accessibilityRole="button" accessibilityLabel={`Delete ${symptom.symptom_type} symptom`} onPress={() => void deleteSymptom(symptom.id)}>
                    <Text style={styles.deleteText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))}
          {unassociatedSymptoms.length > 0 && (
            <View style={styles.unassociatedSection}>
              <Text style={styles.timelineTitle}>Other symptom entries</Text>
              {unassociatedSymptoms.map((symptom) => (
                <View key={symptom.id} style={styles.symptomRow}>
                  <View testID={`zepbound-health-symptom-content-${symptom.id}`} style={styles.symptomContent}>
                    <Text style={[styles.symptomText, webWrappingText]}>
                      {symptom.symptom_type === 'None' ? 'No symptoms' : `${symptom.symptom_type} · ${symptom.severity}/5`}
                    </Text>
                    <Text style={styles.historySecondary}>{symptom.log_date}</Text>
                    {symptom.notes && <Text style={[styles.notes, webWrappingText]}>{symptom.notes}</Text>}
                  </View>
                  <TouchableOpacity style={styles.deleteButton} accessibilityRole="button" accessibilityLabel={`Delete ${symptom.symptom_type} symptom`} onPress={() => void deleteSymptom(symptom.id)}>
                    <Text style={styles.deleteText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          {dailyCheckins.length > 0 && (
            <View style={styles.unassociatedSection}>
              <Text style={styles.timelineTitle}>Daily check-ins</Text>
              {dailyCheckins.map((checkin) => {
                const workout = checkin.worked_out === null
                  ? 'Workout unanswered'
                  : checkin.worked_out
                    ? checkin.workout_duration_minutes === null
                      ? 'Workout: logged, duration unavailable'
                      : `Workout ${checkin.workout_duration_minutes} min`
                    : 'Workout No';
                const bowel = checkin.pooped === null
                  ? 'Pooped unanswered'
                  : `Pooped ${checkin.pooped ? 'Yes' : 'No'}`;
                return (
                  <View key={checkin.id} style={styles.historyItem}>
                    <Text style={[styles.historyPrimary, webWrappingText]}>
                      {checkin.log_date} · {workout} · {bowel}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}
    </HealthCard>
  );
}

const styles = StyleSheet.create({
  helper: { fontFamily: Fonts.body, fontSize: FontSizes.bodySm, color: Colors.textSecondary, lineHeight: 18 },
  nextDate: { fontFamily: Fonts.body, fontSize: FontSizes.bodySm, color: Colors.purple, marginTop: Spacing.sm },
  loading: { marginTop: Spacing.md },
  empty: { fontFamily: Fonts.body, fontSize: FontSizes.bodySm, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.md },
  timeline: { marginTop: Spacing.lg },
  timelineTitle: { fontFamily: Fonts.body, fontSize: FontSizes.bodySm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  unassociatedSection: { marginTop: Spacing.md },
  historyItem: { borderTopWidth: 1, borderTopColor: Colors.tabBarBorder, paddingVertical: Spacing.sm },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  historyPrimary: { fontFamily: Fonts.body, fontSize: FontSizes.bodySm, color: Colors.textPrimary },
  historySecondary: { fontFamily: Fonts.body, fontSize: FontSizes.bodyXs, color: Colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  notes: { fontFamily: Fonts.body, fontSize: FontSizes.bodyXs, color: Colors.textSecondary, marginTop: Spacing.xs, flexShrink: 1 },
  symptomRow: { flexDirection: 'row', maxWidth: '100%', backgroundColor: Colors.softPink, borderRadius: BorderRadius.sm, padding: Spacing.sm, marginTop: Spacing.xs },
  symptomContent: { flex: 1, flexShrink: 1, minWidth: 0 },
  symptomText: { fontFamily: Fonts.body, fontSize: FontSizes.bodyXs, color: Colors.textPrimary, flexShrink: 1 },
  deleteButton: { flexShrink: 0, marginLeft: Spacing.sm, alignSelf: 'flex-start' },
  deleteText: { fontFamily: Fonts.body, fontSize: FontSizes.bodyXs, color: Colors.error },
});
