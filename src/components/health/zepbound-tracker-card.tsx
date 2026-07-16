import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { HealthCard } from './health-card';
import { PixelButton } from '../ui';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useZepbound } from '../../hooks/use-zepbound';
import type { ZepboundInjectionSite } from '../../types/database';
import { toDateKey } from '../../utils/storage';

const DOSES = [2.5, 5, 7.5, 10, 12.5, 15];
const SITES: Array<{ value: ZepboundInjectionSite; label: string }> = [
  { value: 'abdomen', label: 'Abdomen' },
  { value: 'thigh', label: 'Thigh' },
  { value: 'upper_arm', label: 'Upper arm' },
  { value: 'other', label: 'Other' },
];
const SYMPTOMS = ['Nausea', 'Reflux', 'Bloating', 'Constipation', 'Diarrhea', 'Headache', 'Fatigue', 'Low appetite', 'Injection site', 'Other'];

function currentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function displayTime(value: string): string {
  const [hourText, minute = '00'] = value.split(':');
  const hour = Number(hourText);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${suffix}`;
}

export function ZepboundTrackerCard() {
  const {
    injections,
    symptoms,
    loading,
    nextInjectionDate,
    saveInjection,
    saveSymptom,
    deleteInjection,
    deleteSymptom,
  } = useZepbound();
  const today = toDateKey(new Date());
  const [shotOpen, setShotOpen] = useState(false);
  const [symptomOpen, setSymptomOpen] = useState(false);
  const [dose, setDose] = useState(2.5);
  const [site, setSite] = useState<ZepboundInjectionSite>('abdomen');
  const [shotDate, setShotDate] = useState(today);
  const [shotTime, setShotTime] = useState(currentTime());
  const [shotNotes, setShotNotes] = useState('');
  const [symptomType, setSymptomType] = useState('Nausea');
  const [severity, setSeverity] = useState(3);
  const [symptomDate, setSymptomDate] = useState(today);
  const [symptomTime, setSymptomTime] = useState(currentTime());
  const [symptomNotes, setSymptomNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recentInjections = injections.slice(0, 6);
  const symptomsByInjection = useMemo(() => {
    const map = new Map<string, typeof symptoms>();
    for (const symptom of symptoms) {
      if (!symptom.injection_id) continue;
      map.set(symptom.injection_id, [...(map.get(symptom.injection_id) ?? []), symptom]);
    }
    return map;
  }, [symptoms]);

  const handleShotSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveInjection({
        injectionDate: shotDate,
        injectionTime: shotTime,
        doseMg: dose,
        injectionSite: site,
        notes: shotNotes,
      });
      setShotNotes('');
      setShotOpen(false);
    } catch {
      setError('Could not save the shot. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSymptomSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveSymptom({
        logDate: symptomDate,
        symptomTime,
        symptomType,
        severity,
        notes: symptomNotes,
      });
      setSymptomNotes('');
      setSymptomOpen(false);
    } catch {
      setError('Could not save the symptom. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <HealthCard title="💉 Zepbound" borderColor={Colors.babyBlue}>
      <Text style={styles.helper}>Weekly shots and how you feel afterward, together in one timeline.</Text>
      {nextInjectionDate && (
        <Text style={styles.nextDate}>
          Next weekly date: {nextInjectionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </Text>
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionButton} onPress={() => setShotOpen((value) => !value)}>
          <Text style={styles.actionText}>+ Log shot</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => setSymptomOpen((value) => !value)}>
          <Text style={styles.actionText}>+ Log symptom</Text>
        </TouchableOpacity>
      </View>

      {shotOpen && (
        <View style={styles.form}>
          <Text style={styles.label}>Dose (mg)</Text>
          <View style={styles.pillWrap}>
            {DOSES.map((value) => (
              <TouchableOpacity key={value} onPress={() => setDose(value)} style={[styles.pill, dose === value && styles.pillActive]}>
                <Text style={[styles.pillText, dose === value && styles.pillTextActive]}>{value}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Date and time</Text>
          <View style={styles.inputRow}>
            <TextInput accessibilityLabel="Shot date" style={styles.input} value={shotDate} onChangeText={setShotDate} placeholder="YYYY-MM-DD" />
            <TextInput accessibilityLabel="Shot time" style={styles.input} value={shotTime} onChangeText={setShotTime} placeholder="HH:MM" />
          </View>
          <Text style={styles.label}>Injection site</Text>
          <View style={styles.pillWrap}>
            {SITES.map((option) => (
              <TouchableOpacity key={option.value} onPress={() => setSite(option.value)} style={[styles.pill, site === option.value && styles.pillActive]}>
                <Text style={[styles.pillText, site === option.value && styles.pillTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput accessibilityLabel="Shot notes" style={[styles.input, styles.fullInput]} value={shotNotes} onChangeText={setShotNotes} placeholder="Optional notes" placeholderTextColor={Colors.textMuted} />
          <PixelButton title="Save shot" onPress={handleShotSave} loading={saving} disabled={saving || !shotDate || !shotTime} />
        </View>
      )}

      {symptomOpen && (
        <View style={styles.form}>
          <Text style={styles.label}>Symptom</Text>
          <View style={styles.pillWrap}>
            {SYMPTOMS.map((value) => (
              <TouchableOpacity key={value} onPress={() => setSymptomType(value)} style={[styles.pill, symptomType === value && styles.pillActive]}>
                <Text style={[styles.pillText, symptomType === value && styles.pillTextActive]}>{value}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Severity</Text>
          <View style={styles.pillWrap}>
            {[1, 2, 3, 4, 5].map((value) => (
              <TouchableOpacity key={value} onPress={() => setSeverity(value)} style={[styles.severityDot, severity === value && styles.severityDotActive]}>
                <Text style={styles.severityText}>{value}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Date and time</Text>
          <View style={styles.inputRow}>
            <TextInput accessibilityLabel="Symptom date" style={styles.input} value={symptomDate} onChangeText={setSymptomDate} placeholder="YYYY-MM-DD" />
            <TextInput accessibilityLabel="Symptom time" style={styles.input} value={symptomTime} onChangeText={setSymptomTime} placeholder="HH:MM" />
          </View>
          <TextInput accessibilityLabel="Symptom notes" style={[styles.input, styles.fullInput]} value={symptomNotes} onChangeText={setSymptomNotes} placeholder="Optional notes" placeholderTextColor={Colors.textMuted} />
          <PixelButton title="Save symptom" onPress={handleSymptomSave} loading={saving} disabled={saving || !symptomDate || !symptomTime} />
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
      {loading ? (
        <ActivityIndicator color={Colors.purple} style={styles.loading} />
      ) : recentInjections.length === 0 ? (
        <Text style={styles.empty}>No shots logged yet.</Text>
      ) : (
        <View style={styles.timeline}>
          <Text style={styles.timelineTitle}>Recent shots</Text>
          {recentInjections.map((injection) => (
            <View key={injection.id} style={styles.historyItem}>
              <View style={styles.historyHeader}>
                <View>
                  <Text style={styles.historyPrimary}>{injection.injection_date} · {displayTime(injection.injection_time)}</Text>
                  <Text style={styles.historySecondary}>{injection.dose_mg} mg · {injection.injection_site.replace('_', ' ')}</Text>
                </View>
                <TouchableOpacity accessibilityLabel="Delete shot" onPress={() => void deleteInjection(injection.id)}>
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
              {injection.notes && <Text style={styles.notes}>{injection.notes}</Text>}
              {(symptomsByInjection.get(injection.id) ?? []).map((symptom) => (
                <View key={symptom.id} style={styles.symptomRow}>
                  <Text style={styles.symptomText}>{symptom.symptom_type} · {symptom.severity}/5 · {symptom.log_date}</Text>
                  <TouchableOpacity accessibilityLabel="Delete symptom" onPress={() => void deleteSymptom(symptom.id)}>
                    <Text style={styles.deleteText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    </HealthCard>
  );
}

const styles = StyleSheet.create({
  helper: { fontFamily: Fonts.body, fontSize: FontSizes.bodySm, color: Colors.textSecondary, lineHeight: 18 },
  nextDate: { fontFamily: Fonts.body, fontSize: FontSizes.bodySm, color: Colors.purple, marginTop: Spacing.sm },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  actionButton: { flex: 1, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.lavender, padding: Spacing.sm, alignItems: 'center' },
  actionText: { fontFamily: Fonts.body, fontSize: FontSizes.bodySm, color: Colors.purple },
  form: { marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.tabBarBorder },
  label: { fontFamily: Fonts.body, fontSize: FontSizes.bodySm, color: Colors.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.sm },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  pill: { borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.tabBarBorder, paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm },
  pillActive: { backgroundColor: Colors.softPurple, borderColor: Colors.purple },
  pillText: { fontFamily: Fonts.body, fontSize: FontSizes.bodyXs, color: Colors.textSecondary },
  pillTextActive: { color: Colors.textPrimary },
  inputRow: { flexDirection: 'row', gap: Spacing.sm },
  input: { flex: 1, borderWidth: 1, borderColor: Colors.tabBarBorder, borderRadius: BorderRadius.md, padding: Spacing.sm, fontFamily: Fonts.body, fontSize: FontSizes.bodySm, color: Colors.textPrimary },
  fullInput: { marginVertical: Spacing.sm },
  severityDot: { width: 32, height: 32, borderRadius: BorderRadius.full, backgroundColor: Colors.softPink, alignItems: 'center', justifyContent: 'center' },
  severityDotActive: { backgroundColor: Colors.pink },
  severityText: { fontFamily: Fonts.body, fontSize: FontSizes.bodySm, color: Colors.textPrimary },
  error: { fontFamily: Fonts.body, fontSize: FontSizes.bodySm, color: Colors.error, marginTop: Spacing.sm },
  loading: { marginTop: Spacing.md },
  empty: { fontFamily: Fonts.body, fontSize: FontSizes.bodySm, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.md },
  timeline: { marginTop: Spacing.lg },
  timelineTitle: { fontFamily: Fonts.body, fontSize: FontSizes.bodySm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  historyItem: { borderTopWidth: 1, borderTopColor: Colors.tabBarBorder, paddingVertical: Spacing.sm },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  historyPrimary: { fontFamily: Fonts.body, fontSize: FontSizes.bodySm, color: Colors.textPrimary },
  historySecondary: { fontFamily: Fonts.body, fontSize: FontSizes.bodyXs, color: Colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  notes: { fontFamily: Fonts.body, fontSize: FontSizes.bodyXs, color: Colors.textSecondary, marginTop: Spacing.xs },
  symptomRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: Colors.softPink, borderRadius: BorderRadius.sm, padding: Spacing.sm, marginTop: Spacing.xs },
  symptomText: { fontFamily: Fonts.body, fontSize: FontSizes.bodyXs, color: Colors.textPrimary },
  deleteText: { fontFamily: Fonts.body, fontSize: FontSizes.bodyXs, color: Colors.error },
});
