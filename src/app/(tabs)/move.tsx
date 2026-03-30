import React, { useState, useEffect, useRef } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { ScreenWrapper, PixelCard, PixelButton } from '../../components/ui';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import {
  useExerciseLog,
  useWeeklyExerciseSummary,
  EXERCISE_TYPES,
  type Intensity,
} from '../../hooks/use-exercise-log';
import { useOuraWorkouts, useWeeklyOuraWorkouts, mapOuraActivity } from '../../hooks/use-oura-workouts';
import { useOura } from '../../hooks/use-oura';
import { toDateKey } from '../../utils/storage';

const INTENSITY_OPTIONS: { key: Intensity; label: string; emoji: string }[] = [
  { key: 'low', label: 'Low', emoji: '🚶' },
  { key: 'moderate', label: 'Moderate', emoji: '🏃' },
  { key: 'high', label: 'High', emoji: '🔥' },
];

const EXERCISE_EMOJIS: Record<string, string> = {
  Pilates: '🧘',
  Lagree: '💪',
  Walking: '🚶',
  Running: '🏃',
  Yoga: '🧘‍♀️',
  'Strength Training': '🏋️',
  Swimming: '🏊',
  Cycling: '🚴',
  Dance: '💃',
  Other: '⚡',
};

const WEEKLY_GOAL_MINUTES = 150;

// ─── Recommendations ───
const PCOS_RECOMMENDATIONS = [
  {
    title: 'Resistance Training',
    frequency: '2-3x/week',
    emoji: '🏋️',
    description:
      'Best for lowering androgens. Lagree counts! Focus on compound movements.',
  },
  {
    title: 'Sweaty Cardio',
    frequency: '2-3x/week',
    emoji: '🔥',
    description:
      '태음인 body type needs vigorous, sweat-inducing exercise. HIIT, running, or dance.',
  },
  {
    title: 'Walking / Luna Walks',
    frequency: 'Daily',
    emoji: '🐕',
    description:
      'Low-stress movement for recovery days. Aim for 7,000+ steps.',
  },
  {
    title: 'Pilates / Yoga',
    frequency: '1-2x/week',
    emoji: '🧘',
    description:
      'Great for flexibility and stress. Combine with resistance days, not as sole exercise.',
  },
];

const CYCLE_NOTES = [
  { phase: 'Follicular (Day 1-14)', note: 'Higher intensity OK — estrogen supports performance', emoji: '🌱' },
  { phase: 'Luteal (Day 15-28)', note: 'Moderate intensity — progesterone increases fatigue', emoji: '🌙' },
  { phase: 'Post egg-freezing', note: 'Listen to your body — ease back gradually', emoji: '💛' },
];

function formatSyncTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin === 1) return '1 min ago';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function MoveScreen() {
  const dateKey = toDateKey(new Date());
  const { entries, loading, addEntry, deleteEntry, totals } = useExerciseLog(dateKey);
  const { weeklyTotals } = useWeeklyExerciseSummary();
  const { workouts: ouraWorkouts, totals: ouraTotals } = useOuraWorkouts(dateKey);
  const { weeklyTotals: ouraWeeklyTotals } = useWeeklyOuraWorkouts();
  const { todayData, isConnected, syncOura, syncing, activityFromYesterday } = useOura();
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const syncedRef = useRef(false);

  // Auto-sync today's Oura data on mount
  useEffect(() => {
    if (isConnected && !syncedRef.current) {
      syncedRef.current = true;
      const today = toDateKey(new Date());
      syncOura(today, today).then(() => {
        setLastSynced(new Date());
      }).catch(() => {
        // Ignore sync errors — data may still be stale but usable
      });
    }
  }, [isConnected, syncOura]);

  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('Pilates');
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const [intensity, setIntensity] = useState<Intensity>('moderate');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Combined weekly stats (manual + Oura)
  const combinedWeeklyMinutes = Math.round(weeklyTotals.minutes + ouraWeeklyTotals.minutes);
  const combinedWeeklySessions = Math.round(weeklyTotals.sessions + ouraWeeklyTotals.sessions);
  const combinedWeeklyCalories = Math.round(weeklyTotals.calories + ouraWeeklyTotals.calories);
  const weeklyProgress = Math.min(combinedWeeklyMinutes / WEEKLY_GOAL_MINUTES, 1);

  const handleSubmit = async () => {
    const dur = parseInt(duration, 10);
    if (!selectedType || isNaN(dur) || dur <= 0) return;
    setSaving(true);

    const cal = calories.trim() ? parseInt(calories, 10) : null;
    const result = await addEntry({
      exercise_type: selectedType,
      duration_minutes: dur,
      calories_burned: cal && !isNaN(cal) ? cal : null,
      intensity,
      notes: notes.trim() || null,
    });

    if (!result?.error) {
      resetForm();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }
    setSaving(false);
  };

  const resetForm = () => {
    setShowForm(false);
    setSelectedType('Pilates');
    setDuration('');
    setCalories('');
    setIntensity('moderate');
    setNotes('');
  };

  return (
    <ScreenWrapper scrollable>
      {/* Title */}
      <Text style={styles.pageTitle}>Move</Text>

      {/* Success Toast */}
      {showSuccess && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>✓ Exercise logged!</Text>
        </View>
      )}

      {/* Weekly Summary */}
      <PixelCard style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>This Week</Text>
        <View style={styles.weeklyStats}>
          <View style={styles.weekStat}>
            <Text style={styles.weekStatValue}>{combinedWeeklyMinutes}</Text>
            <Text style={styles.weekStatLabel}>min</Text>
          </View>
          <View style={styles.weekStatDivider} />
          <View style={styles.weekStat}>
            <Text style={styles.weekStatValue}>{combinedWeeklySessions}</Text>
            <Text style={styles.weekStatLabel}>sessions</Text>
          </View>
          <View style={styles.weekStatDivider} />
          <View style={styles.weekStat}>
            <Text style={styles.weekStatValue}>{combinedWeeklyCalories}</Text>
            <Text style={styles.weekStatLabel}>cal</Text>
          </View>
        </View>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${weeklyProgress * 100}%` },
                weeklyProgress >= 1 && styles.progressComplete,
              ]}
            />
          </View>
          <Text style={styles.progressLabel}>
            {combinedWeeklyMinutes} / {WEEKLY_GOAL_MINUTES} min goal
            {weeklyProgress >= 1 ? ' ✨' : ''}
          </Text>
        </View>
      </PixelCard>

      {/* Activity Breakdown (from Oura) */}
      {isConnected && (
        <PixelCard style={styles.sectionCard}>
          <View style={styles.activityHeader}>
            <Text style={styles.sectionTitle}>Daily Activity</Text>
            <View style={styles.activityBadgeRow}>
              {syncing && <Text style={styles.syncingText}>🔄 Syncing...</Text>}
              {!syncing && lastSynced && (
                <Text style={styles.syncedText}>
                  🔄 Synced {formatSyncTime(lastSynced)}
                </Text>
              )}
              <Text style={styles.ouraRingBadge}>💍</Text>
            </View>
          </View>
          {activityFromYesterday && (
            <Text style={styles.yesterdayNote}>📊 Showing yesterday's activity — today's data updates later</Text>
          )}
          {todayData ? (
            <View style={styles.activityGrid}>
              {todayData.activity_score != null && (
                <View style={styles.activityItem}>
                  <Text style={[styles.activityValue, styles.scoreValue]}>{Math.round(todayData.activity_score)}</Text>
                  <Text style={styles.activityLabel}>Score</Text>
                </View>
              )}
              {todayData.steps != null && (
                <View style={styles.activityItem}>
                  <Text style={styles.activityValue}>{todayData.steps.toLocaleString()}</Text>
                  <Text style={styles.activityLabel}>Steps</Text>
                </View>
              )}
              {todayData.total_calories != null && (
                <View style={styles.activityItem}>
                  <Text style={styles.activityValue}>{Math.round(todayData.total_calories)}</Text>
                  <Text style={styles.activityLabel}>Total Cal</Text>
                </View>
              )}
              {todayData.active_calories != null && (
                <View style={styles.activityItem}>
                  <Text style={styles.activityValue}>{Math.round(todayData.active_calories)}</Text>
                  <Text style={styles.activityLabel}>Active Cal</Text>
                </View>
              )}
              {todayData.high_activity_minutes != null && (
                <View style={styles.activityItem}>
                  <Text style={[styles.activityValue, styles.highActivity]}>{Math.round(todayData.high_activity_minutes)}</Text>
                  <Text style={styles.activityLabel}>High min</Text>
                </View>
              )}
              {todayData.medium_activity_minutes != null && (
                <View style={styles.activityItem}>
                  <Text style={[styles.activityValue, styles.medActivity]}>{Math.round(todayData.medium_activity_minutes)}</Text>
                  <Text style={styles.activityLabel}>Med min</Text>
                </View>
              )}
              {todayData.low_activity_minutes != null && (
                <View style={styles.activityItem}>
                  <Text style={styles.activityValue}>{Math.round(todayData.low_activity_minutes)}</Text>
                  <Text style={styles.activityLabel}>Low min</Text>
                </View>
              )}
              {todayData.equivalent_walking_distance != null && (
                <View style={styles.activityItem}>
                  <Text style={styles.activityValue}>{(todayData.equivalent_walking_distance / 1000).toFixed(1)}</Text>
                  <Text style={styles.activityLabel}>km equiv</Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.noActivityText}>
              {syncing ? 'Fetching today\'s data...' : 'No activity data yet today — your Oura Ring will sync soon! 💍'}
            </Text>
          )}
        </PixelCard>
      )}

      {/* Today's Exercises */}
      <Text style={styles.sectionTitle}>Today</Text>

      {/* Oura Workouts */}
      {ouraWorkouts.length > 0 && (
        <View style={styles.entriesSection}>
          {ouraWorkouts.map((workout) => {
            const mappedType = mapOuraActivity(workout.activity_type);
            return (
              <PixelCard key={workout.id} style={styles.entryCard}>
                <View style={styles.entryRow}>
                  <View style={styles.entryContent}>
                    <View style={styles.ouraEntryHeader}>
                      <Text style={styles.entryType}>
                        {EXERCISE_EMOJIS[mappedType] ?? '⚡'} {workout.label || mappedType}
                      </Text>
                      <Text style={styles.ouraRingBadge}>💍</Text>
                    </View>
                    <Text style={styles.entryDetails}>
                      {workout.duration_minutes ? `${Math.round(workout.duration_minutes)} min` : ''}
                      {workout.intensity ? ` · ${workout.intensity}` : ''}
                      {workout.calories ? ` · ${Math.round(workout.calories)} cal` : ''}
                      {workout.distance_meters && workout.distance_meters > 0
                        ? ` · ${(workout.distance_meters / 1000).toFixed(1)} km`
                        : ''}
                    </Text>
                    {workout.start_time && (
                      <Text style={styles.entryNotes}>
                        {formatTime(workout.start_time)}
                        {workout.end_time ? ` – ${formatTime(workout.end_time)}` : ''}
                        {workout.source ? ` · via ${workout.source}` : ''}
                      </Text>
                    )}
                  </View>
                </View>
              </PixelCard>
            );
          })}
        </View>
      )}

      {/* Add Exercise Button / Form */}
      {!showForm ? (
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
          <Text style={styles.addBtnText}>+ Add Exercise</Text>
        </TouchableOpacity>
      ) : (
        <PixelCard style={styles.sectionCard}>
          {/* Exercise type pills */}
          <Text style={styles.formLabel}>Exercise Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
            <View style={styles.pillRow}>
              {EXERCISE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setSelectedType(type)}
                  style={[styles.pill, selectedType === type && styles.pillActive]}
                >
                  <Text style={[styles.pillText, selectedType === type && styles.pillTextActive]}>
                    {EXERCISE_EMOJIS[type] ?? '⚡'} {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Intensity */}
          <Text style={styles.formLabel}>Intensity</Text>
          <View style={styles.intensityRow}>
            {INTENSITY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setIntensity(opt.key)}
                style={[styles.intensityPill, intensity === opt.key && styles.intensityPillActive]}
              >
                <Text
                  style={[
                    styles.intensityText,
                    intensity === opt.key && styles.intensityTextActive,
                  ]}
                >
                  {opt.emoji} {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Duration & Calories */}
          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.formLabel}>Duration (min)</Text>
              <TextInput
                style={styles.textInput}
                value={duration}
                onChangeText={setDuration}
                placeholder="30"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.formLabel}>Calories (optional)</Text>
              <TextInput
                style={styles.textInput}
                value={calories}
                onChangeText={setCalories}
                placeholder="200"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Notes */}
          <Text style={styles.formLabel}>Notes (optional)</Text>
          <TextInput
            style={styles.textArea}
            value={notes}
            onChangeText={setNotes}
            placeholder="How did it feel?"
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={2}
          />

          {/* Buttons */}
          <View style={styles.formButtons}>
            <PixelButton title="Cancel" variant="outline" onPress={resetForm} />
            <PixelButton
              title={saving ? 'Saving...' : 'Save'}
              onPress={handleSubmit}
              disabled={saving || !duration.trim()}
            />
          </View>
        </PixelCard>
      )}

      {/* Manual exercise entries */}
      {loading && entries.length === 0 && (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Loading...</Text>
        </View>
      )}

      {entries.length > 0 && (
        <View style={styles.entriesSection}>
          {entries.map((entry) => (
            <PixelCard key={entry.id} style={styles.entryCard}>
              <View style={styles.entryRow}>
                <View style={styles.entryContent}>
                  <Text style={styles.entryType}>
                    {EXERCISE_EMOJIS[entry.exercise_type] ?? '⚡'} {entry.exercise_type}
                  </Text>
                  <Text style={styles.entryDetails}>
                    {entry.duration_minutes ? `${entry.duration_minutes} min` : ''}
                    {entry.intensity ? ` · ${entry.intensity}` : ''}
                    {entry.calories_burned ? ` · ${entry.calories_burned} cal` : ''}
                  </Text>
                  {entry.notes ? (
                    <Text style={styles.entryNotes}>{entry.notes}</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => deleteEntry(entry.id)}
                >
                  <Text style={styles.deleteBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            </PixelCard>
          ))}
        </View>
      )}

      {/* Today's totals (combined) */}
      {(totals.sessions > 0 || ouraTotals.sessions > 0) && (
        <View style={styles.todayTotals}>
          <Text style={styles.todayTotalsText}>
            Today: {totals.minutes + ouraTotals.minutes} min · {totals.sessions + ouraTotals.sessions} session{(totals.sessions + ouraTotals.sessions) !== 1 ? 's' : ''}
            {(totals.calories + ouraTotals.calories) > 0 ? ` · ${totals.calories + ouraTotals.calories} cal` : ''}
          </Text>
        </View>
      )}

      {!loading && entries.length === 0 && ouraWorkouts.length === 0 && !showForm && (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>🏃‍♀️</Text>
          <Text style={styles.emptyText}>No exercises logged today</Text>
          <Text style={styles.emptyHint}>Tap + to log your workout</Text>
        </View>
      )}

      {/* Exercise Recommendations */}
      <Text style={styles.sectionTitle}>Recommended for You</Text>
      <Text style={styles.sectionSubtitle}>
        For PCOS (high androgen) + 태음인 body type
      </Text>

      {PCOS_RECOMMENDATIONS.map((rec) => (
        <PixelCard key={rec.title} style={styles.recCard}>
          <View style={styles.recHeader}>
            <Text style={styles.recEmoji}>{rec.emoji}</Text>
            <View style={styles.recTitleWrap}>
              <Text style={styles.recTitle}>{rec.title}</Text>
              <Text style={styles.recFreq}>{rec.frequency}</Text>
            </View>
          </View>
          <Text style={styles.recDesc}>{rec.description}</Text>
        </PixelCard>
      ))}

      {/* Cycle-Aware Notes */}
      <Text style={styles.sectionTitle}>Cycle-Aware Training</Text>
      <PixelCard style={styles.sectionCard}>
        {CYCLE_NOTES.map((note) => (
          <View key={note.phase} style={styles.cycleRow}>
            <Text style={styles.cycleEmoji}>{note.emoji}</Text>
            <View style={styles.cycleContent}>
              <Text style={styles.cyclePhase}>{note.phase}</Text>
              <Text style={styles.cycleNote}>{note.note}</Text>
            </View>
          </View>
        ))}
      </PixelCard>

      {/* Bottom spacing */}
      <View style={{ height: Spacing.xxl }} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    fontFamily: Fonts.pixel,
    fontSize: FontSizes.lg,
    color: Colors.purple,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  sectionSubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  sectionCard: {
    marginBottom: Spacing.md,
  },

  // ─── Weekly Summary ───
  weeklyStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  weekStat: {
    flex: 1,
    alignItems: 'center',
  },
  weekStatValue: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.purple,
  },
  weekStatLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
  },
  weekStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.tabBarBorder,
  },
  progressContainer: {
    marginTop: Spacing.xs,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.tabBarBorder,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.purple,
    borderRadius: 4,
  },
  progressComplete: {
    backgroundColor: Colors.success,
  },
  progressLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },

  // ─── Activity Breakdown ───
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  syncingText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.purple,
  },
  syncedText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
  },
  yesterdayNote: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.warning,
    marginBottom: Spacing.sm,
    fontStyle: 'italic',
  },
  scoreValue: {
    color: Colors.success,
  },
  noActivityText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.md,
    fontStyle: 'italic',
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  activityItem: {
    alignItems: 'center',
    minWidth: 70,
    flex: 1,
    paddingVertical: Spacing.xs,
  },
  activityValue: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.purple,
  },
  activityLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  highActivity: {
    color: Colors.error,
  },
  medActivity: {
    color: Colors.warning,
  },

  // ─── Add Button ───
  addBtn: {
    backgroundColor: Colors.purple,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  addBtnText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textOnDark,
  },

  // ─── Form ───
  formLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  pillScroll: {
    flexGrow: 0,
  },
  pillRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
  },
  pillActive: {
    backgroundColor: Colors.purple,
    borderColor: Colors.purple,
  },
  pillText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
  },
  pillTextActive: {
    color: Colors.textOnDark,
  },
  intensityRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  intensityPill: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    alignItems: 'center',
  },
  intensityPillActive: {
    backgroundColor: Colors.purple,
    borderColor: Colors.purple,
  },
  intensityText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
  },
  intensityTextActive: {
    color: Colors.textOnDark,
  },
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  inputGroup: {
    flex: 1,
  },
  textInput: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    padding: Spacing.md,
    color: Colors.textPrimary,
  },
  textArea: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    padding: Spacing.md,
    color: Colors.textPrimary,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },

  // ─── Entries ───
  entriesSection: {
    marginTop: Spacing.sm,
  },
  entryCard: {
    marginBottom: Spacing.sm,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryContent: {
    flex: 1,
  },
  ouraEntryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ouraRingBadge: {
    fontSize: 16,
  },
  entryType: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
  },
  entryDetails: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  entryNotes: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.softPink,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  deleteBtnText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.error,
  },
  todayTotals: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  todayTotalsText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
  },

  // ─── Empty ───
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  emptyHint: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
  },

  // ─── Recommendations ───
  recCard: {
    marginBottom: Spacing.sm,
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  recEmoji: {
    fontSize: 28,
    marginRight: Spacing.md,
  },
  recTitleWrap: {
    flex: 1,
  },
  recTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
  },
  recFreq: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.purple,
    marginTop: 2,
  },
  recDesc: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  // ─── Cycle Notes ───
  cycleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  cycleEmoji: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  cycleContent: {
    flex: 1,
  },
  cyclePhase: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  cycleNote: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },

  // ─── Toast ───
  toast: {
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  toastText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textOnDark,
  },
});
