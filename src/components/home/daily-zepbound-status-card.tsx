import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useZepbound } from '../../hooks/use-zepbound';
import { toDateKey } from '../../utils/storage';
import type { ZepboundInjectionSite } from '../../types/database';
import {
  validateZepboundInjection,
  validateZepboundSymptom,
} from '../../utils/zepbound-validation';
import { PixelButton } from '../ui';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../../constants/theme';

const DOSES = [2.5, 5, 7.5, 10, 12.5, 15];
const SITES: Array<{ value: ZepboundInjectionSite; label: string }> = [
  { value: 'abdomen', label: 'Abdomen' },
  { value: 'thigh', label: 'Thigh' },
  { value: 'upper_arm', label: 'Upper arm' },
];
const SYMPTOMS = [
  'Nausea',
  'Reflux',
  'Bloating',
  'Constipation',
  'Diarrhea',
  'Headache',
  'Fatigue',
  'Low appetite',
  'Injection site',
  'Other',
];

function currentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function displayDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** The selected-day Zepbound entry surface. Home owns logging; Health owns history. */
export function DailyZepboundLogCard({ date }: { date: Date }) {
  const router = useRouter();
  const {
    injections,
    symptoms,
    loading,
    lastInjection,
    nextInjectionDate,
    saveInjection,
    saveSymptom,
  } = useZepbound();
  const dateKey = useMemo(() => toDateKey(date), [date]);
  const shotsForDay = injections.filter((item) => item.injection_date === dateKey);
  const symptomsForDay = symptoms.filter((item) => item.log_date === dateKey);

  const [openForm, setOpenForm] = useState<'shot' | 'symptom' | null>(null);
  const [dose, setDose] = useState(2.5);
  const [shotTime, setShotTime] = useState(currentTime());
  const [showOptionalShotDetails, setShowOptionalShotDetails] = useState(false);
  const [site, setSite] = useState<ZepboundInjectionSite | null>(null);
  const [shotNotes, setShotNotes] = useState('');
  const [symptomType, setSymptomType] = useState('Nausea');
  const [severity, setSeverity] = useState(3);
  const [symptomTime, setSymptomTime] = useState(currentTime());
  const [symptomNotes, setSymptomNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOpenForm(null);
    setError(null);
  }, [dateKey]);

  const toggleForm = (form: 'shot' | 'symptom') => {
    setError(null);
    setOpenForm((current) => current === form ? null : form);
  };

  const handleShotSave = async () => {
    const input = {
      injectionDate: dateKey,
      injectionTime: shotTime,
      doseMg: dose,
      injectionSite: site ?? 'other' as ZepboundInjectionSite,
      notes: shotNotes,
    };
    const validationError = validateZepboundInjection(input);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await saveInjection(input);
      setShotNotes('');
      setSite(null);
      setShowOptionalShotDetails(false);
      setOpenForm(null);
    } catch {
      setError('Could not save the shot. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSymptomSave = async () => {
    const input = {
      logDate: dateKey,
      symptomTime,
      symptomType,
      severity,
      notes: symptomNotes,
    };
    const validationError = validateZepboundSymptom(input);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await saveSymptom(input);
      setSymptomNotes('');
      setOpenForm(null);
    } catch {
      setError('Could not save the symptom. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>💉 Zepbound</Text>
          <Text style={styles.dateContext}>{`Logging for ${displayDate(date)}`}</Text>
        </View>
        <TouchableOpacity accessibilityRole="link" onPress={() => router.push('/health')} activeOpacity={0.7}>
          <Text style={styles.openText}>View history ›</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.purple} style={styles.loading} />
      ) : (
        <>
          {shotsForDay.length > 0 || symptomsForDay.length > 0 ? (
            <View style={styles.statusWrap}>
              {shotsForDay.map((shot) => (
                <Text key={shot.id} style={styles.statusText}>
                  ✓ Shot {shot.dose_mg} mg at {shot.injection_time.slice(0, 5)}
                </Text>
              ))}
              {symptomsForDay.map((symptom) => (
                <Text key={symptom.id} style={styles.statusText}>
                  {symptom.symptom_type} · {symptom.severity}/5 at {symptom.symptom_time.slice(0, 5)}
                </Text>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>
              {lastInjection && nextInjectionDate
                ? `Last shot ${lastInjection.injection_date} · next weekly date ${toDateKey(nextInjectionDate)}`
                : `No Zepbound entries for ${displayDate(date)}.`}
            </Text>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ expanded: openForm === 'shot' }}
              aria-expanded={openForm === 'shot'}
              style={styles.actionButton}
              onPress={() => toggleForm('shot')}
            >
              <Text style={styles.actionText}>+ Log shot</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ expanded: openForm === 'symptom' }}
              aria-expanded={openForm === 'symptom'}
              style={styles.actionButton}
              onPress={() => toggleForm('symptom')}
            >
              <Text style={styles.actionText}>+ Log symptom</Text>
            </TouchableOpacity>
          </View>

          {openForm === 'shot' && (
            <View style={styles.form}>
              <Text style={styles.formTitle}>{`Shot on ${displayDate(date)}`}</Text>
              <Text style={styles.label}>Dose (mg)</Text>
              <View style={styles.pillWrap}>
                {DOSES.map((value) => (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityState={{ selected: dose === value }}
                    aria-selected={dose === value}
                    key={value}
                    onPress={() => setDose(value)}
                    style={[styles.pill, dose === value && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, dose === value && styles.pillTextActive]}>{value}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>Time</Text>
              <TextInput
                accessibilityLabel="Shot time"
                style={styles.input}
                value={shotTime}
                onChangeText={setShotTime}
                placeholder="HH:MM"
                placeholderTextColor={Colors.textMuted}
              />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ expanded: showOptionalShotDetails }}
                aria-expanded={showOptionalShotDetails}
                onPress={() => setShowOptionalShotDetails((value) => !value)}
              >
                <Text style={styles.optionalToggle}>Optional details {showOptionalShotDetails ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showOptionalShotDetails && (
                <View>
                  <Text style={styles.label}>Injection site</Text>
                  <View style={styles.pillWrap}>
                    {SITES.map((option) => (
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityState={{ selected: site === option.value }}
                        aria-selected={site === option.value}
                        key={option.value}
                        onPress={() => setSite(option.value)}
                        style={[styles.pill, site === option.value && styles.pillActive]}
                      >
                        <Text style={[styles.pillText, site === option.value && styles.pillTextActive]}>{option.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    accessibilityLabel="Shot notes"
                    style={[styles.input, styles.notesInput]}
                    value={shotNotes}
                    onChangeText={setShotNotes}
                    placeholder="Optional notes"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              )}
              <PixelButton title={saving ? 'Saving...' : 'Save shot'} onPress={handleShotSave} disabled={saving} />
            </View>
          )}

          {openForm === 'symptom' && (
            <View style={styles.form}>
              <Text style={styles.formTitle}>{`Symptom on ${displayDate(date)}`}</Text>
              <Text style={styles.label}>Symptom</Text>
              <View style={styles.pillWrap}>
                {SYMPTOMS.map((value) => (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityState={{ selected: symptomType === value }}
                    aria-selected={symptomType === value}
                    key={value}
                    onPress={() => setSymptomType(value)}
                    style={[styles.pill, symptomType === value && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, symptomType === value && styles.pillTextActive]}>{value}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>Severity</Text>
              <View style={styles.pillWrap}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Severity ${value}`}
                    accessibilityState={{ selected: severity === value }}
                    aria-selected={severity === value}
                    key={value}
                    onPress={() => setSeverity(value)}
                    style={[styles.severityDot, severity === value && styles.severityDotActive]}
                  >
                    <Text style={styles.severityText}>{value}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>Time</Text>
              <TextInput
                accessibilityLabel="Symptom time"
                style={styles.input}
                value={symptomTime}
                onChangeText={setSymptomTime}
                placeholder="HH:MM"
                placeholderTextColor={Colors.textMuted}
              />
              <TextInput
                accessibilityLabel="Symptom notes"
                style={[styles.input, styles.notesInput]}
                value={symptomNotes}
                onChangeText={setSymptomNotes}
                placeholder="Optional notes"
                placeholderTextColor={Colors.textMuted}
              />
              <PixelButton title={saving ? 'Saving...' : 'Save symptom'} onPress={handleSymptomSave} disabled={saving} />
            </View>
          )}

          {error && <Text style={styles.error}>{error}</Text>}
        </>
      )}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontFamily: Fonts.body, fontSize: FontSizes.bodyLg, color: Colors.textPrimary },
  dateContext: { fontFamily: Fonts.body, fontSize: FontSizes.bodyXs, color: Colors.textMuted, marginTop: 2 },
  openText: { fontFamily: Fonts.body, fontSize: FontSizes.bodyXs, color: Colors.purple, paddingTop: 2 },
  loading: { marginTop: Spacing.md },
  statusWrap: { gap: Spacing.xs, marginTop: Spacing.sm },
  statusText: { fontFamily: Fonts.body, fontSize: FontSizes.bodySm, color: Colors.textPrimary },
  emptyText: { fontFamily: Fonts.body, fontSize: FontSizes.bodySm, color: Colors.textSecondary, marginTop: Spacing.sm },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  actionButton: { flex: 1, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.lavender, padding: Spacing.sm, alignItems: 'center' },
  actionText: { fontFamily: Fonts.body, fontSize: FontSizes.bodySm, color: Colors.purple },
  form: { marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.tabBarBorder },
  formTitle: { fontFamily: Fonts.body, fontSize: FontSizes.bodySm, color: Colors.textPrimary },
  label: { fontFamily: Fonts.body, fontSize: FontSizes.bodySm, color: Colors.textSecondary, marginBottom: Spacing.xs, marginTop: Spacing.sm },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  pill: { borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.tabBarBorder, paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm },
  pillActive: { backgroundColor: Colors.softPurple, borderColor: Colors.purple },
  pillText: { fontFamily: Fonts.body, fontSize: FontSizes.bodyXs, color: Colors.textSecondary },
  pillTextActive: { color: Colors.textPrimary },
  input: { borderWidth: 1, borderColor: Colors.tabBarBorder, borderRadius: BorderRadius.md, padding: Spacing.sm, fontFamily: Fonts.body, fontSize: FontSizes.bodySm, color: Colors.textPrimary },
  notesInput: { marginVertical: Spacing.sm },
  optionalToggle: { fontFamily: Fonts.body, fontSize: FontSizes.bodyXs, color: Colors.purple, marginTop: Spacing.md },
  severityDot: { width: 32, height: 32, borderRadius: BorderRadius.full, backgroundColor: Colors.softPink, alignItems: 'center', justifyContent: 'center' },
  severityDotActive: { backgroundColor: Colors.pink },
  severityText: { fontFamily: Fonts.body, fontSize: FontSizes.bodySm, color: Colors.textPrimary },
  error: { fontFamily: Fonts.body, fontSize: FontSizes.bodySm, color: Colors.error, marginTop: Spacing.sm },
});
