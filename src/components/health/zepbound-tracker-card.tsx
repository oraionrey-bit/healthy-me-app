import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { HealthCard } from './health-card';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useZepbound } from '../../hooks/use-zepbound';
import { formatDatabaseTime } from '../../utils/zepbound-time';

/** Longitudinal review and correction surface; routine entry belongs on Home. */
export function ZepboundTrackerCard() {
  const {
    injections,
    symptoms,
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
      ) : injections.length === 0 && symptoms.length === 0 ? (
        <Text style={styles.empty}>No shots or symptoms logged yet. Start on Home.</Text>
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
                  <View>
                    <Text style={styles.symptomText}>{symptom.symptom_type} · {symptom.severity}/5</Text>
                    <Text style={styles.historySecondary}>{symptom.log_date} · {formatDatabaseTime(symptom.symptom_time)}</Text>
                    {symptom.notes && <Text style={styles.notes}>{symptom.notes}</Text>}
                  </View>
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Delete ${symptom.symptom_type} symptom`} onPress={() => void deleteSymptom(symptom.id)}>
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
                  <View>
                    <Text style={styles.symptomText}>{symptom.symptom_type} · {symptom.severity}/5</Text>
                    <Text style={styles.historySecondary}>{symptom.log_date} · {formatDatabaseTime(symptom.symptom_time)}</Text>
                    {symptom.notes && <Text style={styles.notes}>{symptom.notes}</Text>}
                  </View>
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Delete ${symptom.symptom_type} symptom`} onPress={() => void deleteSymptom(symptom.id)}>
                    <Text style={styles.deleteText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
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
  notes: { fontFamily: Fonts.body, fontSize: FontSizes.bodyXs, color: Colors.textSecondary, marginTop: Spacing.xs },
  symptomRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: Colors.softPink, borderRadius: BorderRadius.sm, padding: Spacing.sm, marginTop: Spacing.xs },
  symptomText: { fontFamily: Fonts.body, fontSize: FontSizes.bodyXs, color: Colors.textPrimary },
  deleteText: { fontFamily: Fonts.body, fontSize: FontSizes.bodyXs, color: Colors.error },
});
