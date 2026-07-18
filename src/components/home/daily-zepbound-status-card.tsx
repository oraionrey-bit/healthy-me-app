import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useZepbound } from '../../hooks/use-zepbound';

import { toDateKey } from '../../utils/storage';
import type { ZepboundDailyCheckin, ZepboundInjectionSite, ZepboundSymptomLog } from '../../types/database';
import {
  validateZepboundInjection,
  validateZepboundSymptom,
} from '../../utils/zepbound-validation';
import {
  currentPacificTime,
  formatDatabaseTime,
  toDatabaseTime,
} from '../../utils/zepbound-time';
import { PixelButton } from '../ui';
import { ZepboundTimeInput } from '../zepbound/zepbound-time-input';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../../constants/theme';

const DOSES = [2.5, 5, 7.5, 10, 12.5, 15];
const SITES: Array<{ value: ZepboundInjectionSite; label: string }> = [
  { value: 'abdomen', label: 'Abdomen' },
  { value: 'thigh', label: 'Thigh' },
  { value: 'upper_arm', label: 'Upper arm' },
];
const SYMPTOMS = [
  'None',
  'Nausea',
  'Reflux',
  'Indigestion',
  'Fullness',
  'Bloating',
  'Constipation',
  'Diarrhea',
  'Headache',
  'Fatigue',
  'Low appetite',
  'Injection site',
  'Other',
];

const webWrappingText: any = Platform.OS === 'web'
  ? { wordBreak: 'break-word' }
  : undefined;

interface SymptomDraft {
  selectedSymptoms: string[];
  severity: number;
  notes: string;
}

/**
 * The editor has one shared severity and note field while legacy data may have
 * different values per row. Keep that conversion deterministic and avoid
 * dropping health information: use the highest severity and join distinct
 * notes in symptom-name order. Current batch-created rows normally agree, so
 * they round-trip unchanged. A saved None wins defensively because it must be
 * exclusive.
 */
function symptomDraftFromRows(rows: ZepboundSymptomLog[]): SymptomDraft {
  const noneRow = rows.find((row) => row.symptom_type === 'None');
  if (noneRow) {
    return {
      selectedSymptoms: ['None'],
      severity: 1,
      notes: noneRow.notes?.trim() ?? '',
    };
  }

  const orderedRows = [...rows].sort((left, right) =>
    left.symptom_type.localeCompare(right.symptom_type) || left.id.localeCompare(right.id));
  const notes = [...new Set(orderedRows.map((row) => row.notes?.trim()).filter(Boolean))].join('\n');
  return {
    selectedSymptoms: [...new Set(orderedRows.map((row) => row.symptom_type))],
    severity: rows.length > 0 ? Math.max(...rows.map((row) => row.severity)) : 3,
    notes,
  };
}

function displayDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function workoutCheckinStatus(checkin: ZepboundDailyCheckin): string | null {
  if (checkin.worked_out === null) return null;
  if (!checkin.worked_out) return 'Workout: No';

  const minutes = checkin.workout_duration_minutes;
  if (minutes === null || !Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
    return 'Workout: logged, duration unavailable';
  }
  return minutes >= 20
    ? `Workout: ${minutes} min · goal met`
    : `Workout: ${minutes} min · ${20 - minutes} min to goal`;
}

function YesNoChoice({
  label,
  value,
  onChange,
}: {
  label: 'Workout' | 'Pooped';
  value: boolean | null;
  onChange: (value: boolean | null) => void;
}) {
  return (
    <View style={styles.yesNoRow}>
      <View accessibilityRole="radiogroup" aria-label={label} style={styles.yesNoChoices}>
        {[true, false].map((choice) => (
          <TouchableOpacity
            accessibilityRole="radio"
            accessibilityLabel={`${label} ${choice ? 'Yes' : 'No'}`}
            accessibilityState={{ checked: value === choice }}
            aria-checked={value === choice}
            key={String(choice)}
            onPress={() => onChange(choice)}
            style={[styles.pill, value === choice && styles.pillActive]}
          >
            <Text style={[styles.pillText, value === choice && styles.pillTextActive]}>
              {choice ? 'Yes' : 'No'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {value !== null && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Clear ${label} answer`}
          onPress={() => onChange(null)}
          style={styles.clearAnswer}
        >
          <Text style={styles.clearAnswerText}>Clear answer</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/** The selected-day Zepbound entry surface. Home owns logging; Health owns history. */
export function DailyZepboundLogCard({ date }: { date: Date }) {
  const router = useRouter();
  const {
    injections,
    symptoms,
    dailyCheckins,
    loading,
    lastInjection,
    nextInjectionDate,
    saveInjection,
    saveDailyLog,
  } = useZepbound();
  const dateKey = useMemo(() => toDateKey(date), [date]);
  const selectedDateKeyRef = useRef(dateKey);
  selectedDateKeyRef.current = dateKey;
  const shotsForDay = injections.filter((item) => item.injection_date === dateKey);
  const symptomsForDay = symptoms.filter((item) => item.log_date === dateKey);
  const checkinForDay = dailyCheckins.find((item) => item.log_date === dateKey) ?? null;
  const symptomOptions = [
    ...SYMPTOMS,
    ...symptomsForDay
      .map((item) => item.symptom_type)
      .filter((value, index, values) => !SYMPTOMS.includes(value) && values.indexOf(value) === index),
  ];

  const [openForm, setOpenForm] = useState<'shot' | 'daily' | null>(null);
  const [dose, setDose] = useState(2.5);
  const [shotTime, setShotTime] = useState(currentPacificTime);
  const [showOptionalShotDetails, setShowOptionalShotDetails] = useState(false);
  const [site, setSite] = useState<ZepboundInjectionSite | null>(null);
  const [shotNotes, setShotNotes] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [severity, setSeverity] = useState(3);
  const [symptomNotes, setSymptomNotes] = useState('');
  const [symptomsDirty, setSymptomsDirty] = useState(false);
  const [symptomDetailsDirty, setSymptomDetailsDirty] = useState(false);
  const [workedOut, setWorkedOut] = useState<boolean | null>(null);
  const [duration, setDuration] = useState('');
  const [pooped, setPooped] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshWarning, setRefreshWarning] = useState<string | null>(null);
  const [preserveDailyDraft, setPreserveDailyDraft] = useState(false);

  useEffect(() => {
    setOpenForm(null);
    setError(null);
    setRefreshWarning(null);
    setSelectedSymptoms([]);
    setSeverity(3);
    setSymptomNotes('');
    setSymptomsDirty(false);
    setSymptomDetailsDirty(false);
    setWorkedOut(null);
    setDuration('');
    setPooped(null);
    setSaving(false);
    setPreserveDailyDraft(false);
  }, [dateKey]);

  const toggleForm = (form: 'shot' | 'daily') => {
    setError(null);
    if (openForm === form) {
      setOpenForm(null);
      if (form === 'daily') setPreserveDailyDraft(false);
      return;
    }
    if (form === 'shot' && openForm === 'daily') setPreserveDailyDraft(true);
    if (form === 'daily') {
      if (!preserveDailyDraft) {
        const draft = symptomDraftFromRows(symptomsForDay);
        setSelectedSymptoms(draft.selectedSymptoms);
        setSeverity(draft.severity);
        setSymptomNotes(draft.notes);
        setSymptomsDirty(false);
        setSymptomDetailsDirty(false);
        setWorkedOut(checkinForDay?.worked_out ?? null);
        setDuration(checkinForDay?.workout_duration_minutes?.toString() ?? '');
        setPooped(checkinForDay?.pooped ?? null);
      }
      setPreserveDailyDraft(false);
    }
    setOpenForm(form);
  };

  const toggleSymptom = (symptom: string) => {
    setSymptomsDirty(true);
    setSelectedSymptoms((current) => {
      if (symptom === 'None') return current.includes('None') ? [] : ['None'];
      const withoutNone = current.filter((value) => value !== 'None');
      return withoutNone.includes(symptom)
        ? withoutNone.filter((value) => value !== symptom)
        : [...withoutNone, symptom];
    });
  };

  const handleShotSave = async () => {
    const databaseTime = toDatabaseTime(shotTime);
    if (!databaseTime) {
      setError('Choose a valid shot time: hour 1–12, minute 00–59, and AM or PM.');
      return;
    }
    const input = {
      injectionDate: dateKey,
      injectionTime: databaseTime,
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

  const durationNumber = /^\d+$/.test(duration) ? Number(duration) : null;
  const validDuration = durationNumber !== null
    && Number.isInteger(durationNumber)
    && durationNumber >= 1
    && durationNumber <= 1440;

  const handleDailySave = async () => {
    const saveDateKey = dateKey;
    if (selectedSymptoms.length === 0 && workedOut === null && pooped === null) {
      setError('Answer at least one part of the daily check-in.');
      return;
    }
    if (workedOut === true && !validDuration) {
      setError('Enter workout duration in whole minutes from 1 to 1440.');
      return;
    }
    // A selection-only edit must not flatten legacy rows that have distinct
    // severities or notes. Preserve each still-selected persisted row exactly;
    // shared severity/notes apply to all only when explicitly edited.
    const inputs = !symptomsDirty
      ? symptomsForDay.map((row) => ({
        symptomType: row.symptom_type,
        severity: row.severity,
        notes: row.notes ?? '',
      }))
      : selectedSymptoms.map((symptomType) => {
        const persisted = !symptomDetailsDirty
          ? symptomsForDay.find((row) => row.symptom_type === symptomType)
          : undefined;
        return persisted
          ? {
            symptomType: persisted.symptom_type,
            severity: persisted.severity,
            notes: persisted.notes ?? '',
          }
          : {
            symptomType,
            severity: symptomType === 'None' ? 1 : severity,
            notes: symptomNotes,
          };
      });
    const validationError = inputs
      .map((input) => validateZepboundSymptom({ ...input, logDate: dateKey }))
      .find(Boolean);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    setRefreshWarning(null);
    try {
      const result = await saveDailyLog({
        logDate: saveDateKey,
        symptoms: inputs,
        workedOut,
        workoutDurationMinutes: workedOut ? durationNumber : null,
        pooped,
      });
      if (selectedDateKeyRef.current !== saveDateKey) return;
      setOpenForm(null);
      if (result?.refreshFailed) {
        setRefreshWarning('Saved successfully, but history could not refresh. Your save is safe; refresh later.');
      }
    } catch {
      if (selectedDateKeyRef.current === saveDateKey) {
        setError('Could not save the daily check-in. Your changes are still here; please try again.');
      }
    } finally {
      if (selectedDateKeyRef.current === saveDateKey) setSaving(false);
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
          {shotsForDay.length > 0 || symptomsForDay.length > 0 || checkinForDay ? (
            <View style={styles.statusWrap}>
              {shotsForDay.map((shot) => (
                <Text key={shot.id} style={styles.statusText}>
                  ✓ Shot {shot.dose_mg} mg at {formatDatabaseTime(shot.injection_time)}
                </Text>
              ))}
              {symptomsForDay.map((symptom) => (
                <Text
                  key={symptom.id}
                  testID={`zepbound-home-symptom-${symptom.id}`}
                  style={[styles.statusText, styles.wrappingText, webWrappingText]}
                >
                  {symptom.symptom_type === 'None' ? 'No symptoms' : `${symptom.symptom_type} · ${symptom.severity}/5`}
                </Text>
              ))}
              {checkinForDay && workoutCheckinStatus(checkinForDay) && (
                <Text style={styles.statusText}>{workoutCheckinStatus(checkinForDay)}</Text>
              )}
              {checkinForDay?.pooped !== null && checkinForDay?.pooped !== undefined && (
                <Text style={styles.statusText}>Pooped: {checkinForDay.pooped ? 'Yes' : 'No'}</Text>
              )}
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
              accessibilityState={{ expanded: openForm === 'daily' }}
              aria-expanded={openForm === 'daily'}
              style={styles.actionButton}
              onPress={() => toggleForm('daily')}
            >
              <Text style={styles.actionText}>
                {symptomsForDay.length > 0 || checkinForDay ? 'Edit daily check-in' : '+ Daily check-in'}
              </Text>
            </TouchableOpacity>
          </View>

          {openForm === 'shot' && (
            <View style={styles.form}>
              <Text style={styles.formTitle}>{`Shot on ${displayDate(date)}`}</Text>
              <Text style={styles.label}>Dose (mg)</Text>
              <View accessibilityRole="radiogroup" aria-label="Dose" style={styles.pillWrap}>
                {DOSES.map((value) => (
                  <TouchableOpacity
                    accessibilityRole="radio"
                    accessibilityState={{ checked: dose === value }}
                    aria-checked={dose === value}
                    key={value}
                    onPress={() => setDose(value)}
                    style={[styles.pill, dose === value && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, dose === value && styles.pillTextActive]}>{value}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <ZepboundTimeInput label="Shot" value={shotTime} onChange={setShotTime} />
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
                  <View accessibilityRole="radiogroup" aria-label="Injection site" style={styles.pillWrap}>
                    {SITES.map((option) => (
                      <TouchableOpacity
                        accessibilityRole="radio"
                        accessibilityState={{ checked: site === option.value }}
                        aria-checked={site === option.value}
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

          {openForm === 'daily' && (
            <View style={styles.form}>
              <Text style={styles.formTitle}>{`Daily Zepbound check-in · ${displayDate(date)}`}</Text>
              <Text style={styles.label}>Symptoms (optional)</Text>
              <View aria-label="Symptoms" style={styles.pillWrap}>
                {symptomOptions.map((value) => (
                  <TouchableOpacity
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selectedSymptoms.includes(value) }}
                    aria-checked={selectedSymptoms.includes(value)}
                    key={value}
                    onPress={() => toggleSymptom(value)}
                    style={[styles.pill, selectedSymptoms.includes(value) && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, selectedSymptoms.includes(value) && styles.pillTextActive]}>{value}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {selectedSymptoms.length > 0 && !selectedSymptoms.includes('None') && (
                <>
                  <Text style={styles.label}>Severity</Text>
                  <View accessibilityRole="radiogroup" aria-label="Severity" style={styles.pillWrap}>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <TouchableOpacity
                        accessibilityRole="radio"
                        accessibilityLabel={`Severity ${value}`}
                        accessibilityState={{ checked: severity === value }}
                        aria-checked={severity === value}
                        key={value}
                        onPress={() => {
                          setSeverity(value);
                          setSymptomsDirty(true);
                          setSymptomDetailsDirty(true);
                        }}
                        style={[styles.severityDot, severity === value && styles.severityDotActive]}
                      >
                        <Text style={styles.severityText}>{value}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
              {selectedSymptoms.length > 0 && (
                <TextInput
                  accessibilityLabel="Symptom notes"
                  style={[styles.input, styles.notesInput]}
                  value={symptomNotes}
                  onChangeText={(value) => {
                    setSymptomNotes(value);
                    setSymptomsDirty(true);
                    setSymptomDetailsDirty(true);
                  }}
                  placeholder="Optional notes"
                  placeholderTextColor={Colors.textMuted}
                />
              )}

              <Text style={styles.label}>Worked out today?</Text>
              <YesNoChoice label="Workout" value={workedOut} onChange={(choice) => {
                setWorkedOut(choice);
                if (choice !== true) setDuration('');
                setError(null);
              }} />
              {workedOut === true && (
                <View>
                  <Text style={styles.label}>Duration (whole minutes)</Text>
                  <View style={styles.durationRow}>
                    {[20, 30, 45, 60].map((minutes) => (
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={`${minutes} minutes`}
                        key={minutes}
                        onPress={() => { setDuration(String(minutes)); setError(null); }}
                        style={[styles.quickPill, duration === String(minutes) && styles.pillActive]}
                      >
                        <Text style={styles.pillText}>{minutes}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    accessibilityLabel="Workout duration minutes"
                    style={[styles.input, styles.durationInput]}
                    value={duration}
                    onChangeText={(value) => { setDuration(value); setError(null); }}
                    keyboardType="number-pad"
                    inputMode="numeric"
                    placeholder="Minutes"
                    placeholderTextColor={Colors.textMuted}
                  />
                  {validDuration && durationNumber >= 20 && <Text style={styles.goalText}>20-minute daily goal met.</Text>}
                  {validDuration && durationNumber < 20 && (
                    <Text style={styles.goalText}>{20 - durationNumber} minutes remaining for today’s 20-minute goal.</Text>
                  )}
                </View>
              )}

              <Text style={styles.label}>Pooped today?</Text>
              <YesNoChoice label="Pooped" value={pooped} onChange={(value) => { setPooped(value); setError(null); }} />
              <View style={styles.checkinSave}>
                <PixelButton title={saving ? 'Saving...' : 'Save daily check-in'} onPress={handleDailySave} disabled={saving} />
              </View>
            </View>
          )}

          {error && <Text style={styles.error}>{error}</Text>}
          {refreshWarning && <Text style={styles.warning}>{refreshWarning}</Text>}
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
  wrappingText: { flexShrink: 1, maxWidth: '100%' },
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
  checkin: { marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.tabBarBorder },
  yesNoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  yesNoChoices: { flexDirection: 'row', gap: Spacing.xs },
  clearAnswer: { paddingVertical: Spacing.xs, paddingHorizontal: 2 },
  clearAnswerText: { fontFamily: Fonts.body, fontSize: FontSizes.bodyXs, color: Colors.purple },
  durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  quickPill: { minWidth: 42, alignItems: 'center', borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.tabBarBorder, paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm },
  durationInput: { marginTop: Spacing.sm, maxWidth: 140 },
  goalText: { fontFamily: Fonts.body, fontSize: FontSizes.bodyXs, color: Colors.textSecondary, marginTop: Spacing.xs },
  checkinSave: { marginTop: Spacing.md },
  input: { borderWidth: 1, borderColor: Colors.tabBarBorder, borderRadius: BorderRadius.md, padding: Spacing.sm, fontFamily: Fonts.body, fontSize: FontSizes.bodySm, color: Colors.textPrimary },
  notesInput: { marginVertical: Spacing.sm },
  optionalToggle: { fontFamily: Fonts.body, fontSize: FontSizes.bodyXs, color: Colors.purple, marginTop: Spacing.md },
  severityDot: { width: 32, height: 32, borderRadius: BorderRadius.full, backgroundColor: Colors.softPink, alignItems: 'center', justifyContent: 'center' },
  severityDotActive: { backgroundColor: Colors.pink },
  severityText: { fontFamily: Fonts.body, fontSize: FontSizes.bodySm, color: Colors.textPrimary },
  error: { fontFamily: Fonts.body, fontSize: FontSizes.bodySm, color: Colors.error, marginTop: Spacing.sm },
  warning: { fontFamily: Fonts.body, fontSize: FontSizes.bodySm, color: Colors.textSecondary, marginTop: Spacing.sm },
});
