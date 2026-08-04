import React, { useState, useCallback, useMemo } from 'react';
import {
  Text,
  View,
  Image,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  ImageSourcePropType,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { PixelCard } from '../../components/ui';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useFoodLog } from '../../hooks/use-food-log';
import { useSupplements } from '../../hooks/use-supplements';
import { useMoodEnergy } from '../../hooks/use-mood-energy';
import { useSymptomLog } from '../../hooks/use-symptom-log';
import { useDailyLog } from '../../hooks/use-daily-log';
import { useDailyPeriodLog } from '../../hooks/use-daily-period-log';
import { useDailyScore } from '../../hooks/use-daily-score';
import type { ScoreBreakdown } from '../../hooks/use-daily-score';
import { useStreak } from '../../hooks/use-streak';
import { useWeeklySummary } from '../../hooks/use-weekly-summary';
import { toDateKey } from '../../utils/storage';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useUserProfile } from '../../hooks/use-user-profile';
import { WaterTracker } from '../../components/home/water-tracker';
import { CalfTrackerCard } from '../../components/home/calf-tracker-card';
import { DailyZepboundLogCard } from '../../components/home/daily-zepbound-status-card';
import { DateNavigator } from '../../components/shared/date-navigator';
import { DailyCheckinCard } from '../../components/home/daily-checkin-card';
import { WeeklyInsightsCard } from '../../components/home/weekly-insights-card';
import {
  dailyLogPeriodToPeriodStatus,
  periodStatusToPeriodLogFlow,
  periodStatusToDailyLogPeriod,
} from '../../constants/check-in';
import { useOura, getBestSteps } from '../../hooks/use-oura';
import { useWeeklyInsights } from '../../hooks/use-weekly-insights';
import { CalorieBalanceCard } from '../../components/home/calorie-balance-card';
import type { UserSupplement, SymptomType } from '../../types/database';

function formatSyncTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin === 1) return '1 min ago';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}

// MOOD_OPTIONS/ENERGY_OPTIONS/PERIOD_OPTIONS/SYMPTOM_OPTIONS now live in
// src/constants/check-in.ts and are consumed by DailyCheckinCard directly.

// ── Supplement Icons ──

const SUPP_ICON_DEFAULT: ImageSourcePropType = require('../../../assets/images/icons/pill.png');
const SUPP_ICON_MAP: Record<string, ImageSourcePropType> = {
  pill: require('../../../assets/images/icons/pill.png'),
  powder: require('../../../assets/images/icons/powder-scoop.png'),
  softgel: require('../../../assets/images/icons/softgel.png'),
  gummy: require('../../../assets/images/icons/gummy.png'),
};

function getSupplementIcon(name: string): ImageSourcePropType {
  const lower = name.toLowerCase();
  if (lower.includes('ovasitol') || lower.includes('powder') || lower.includes('inositol')) return SUPP_ICON_MAP.powder;
  if (lower.includes('omega') || lower.includes('fish oil') || lower.includes('vitamin d') || lower.includes('softgel')) return SUPP_ICON_MAP.softgel;
  if (lower.includes('gummy') || lower.includes('bionerlab') || lower.includes('bioner')) return SUPP_ICON_MAP.gummy;
  return SUPP_ICON_DEFAULT;
}

// ── Supplement Group Component ──

export const SupplementGroup = React.memo(function SupplementGroup({
  title,
  items,
  isChecked,
  onToggle,
}: {
  title: string;
  items: UserSupplement[];
  isChecked: (id: string) => boolean;
  onToggle: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <View style={styles.supplementGroup}>
      <Text style={styles.groupLabel}>{title}</Text>
      <View style={styles.checklistGap}>
        {items.map((item) => {
          const done = isChecked(item.id);
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => onToggle(item.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkRow, done && styles.checkRowDone]}>
                <View style={[styles.checkbox, done && styles.checkboxDone]}>
                  {done && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Image source={getSupplementIcon(item.supplement_name)} style={styles.suppIcon} />
                <Text style={[styles.checkLabel, done && styles.checkLabelDone]}>
                  {item.supplement_name}
                  {item.dosage ? ` (${item.dosage})` : ''}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

// EmojiPicker / SymptomChip / SeverityDots are now imported from
// src/components/home/{emoji-picker,symptom-chip,severity-dots} (May 7 split).

// ── Main Screen ──

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { calorieTarget, proteinTarget } = useUserProfile();

  // ── Time-travel date navigation (restored May 7) ──
  const [selectedDate, setSelectedDate] = useState(new Date());
  const isToday = useMemo(
    () => selectedDate.toDateString() === new Date().toDateString(),
    [selectedDate],
  );
  const selectedDateKey = useMemo(() => toDateKey(selectedDate), [selectedDate]);

  const { totals } = useFoodLog(selectedDateKey);

  const {
    morningSupplements,
    eveningSupplements,
    takenCount,
    totalCount,
    loading: supplementsLoading,
    isSupplementTaken,
    toggleSupplement,
    addSupplement,
  } = useSupplements(selectedDate);
  const { mood: savedMood, energy: savedEnergy, saveMoodEnergy } = useMoodEnergy(selectedDate);
  const { symptomLogs, addSymptom, removeSymptom, updateSymptomLog } = useSymptomLog(selectedDate);
  const { dailyLog, saveDailyLog } = useDailyLog(selectedDate);
  const { periodLog, savePeriodFlow } = useDailyPeriodLog(selectedDateKey);
  const { score: dailyScoreValue, breakdown: dailyBreakdown, tips: dailyTips } = useDailyScore();
  const [scoreExpanded, setScoreExpanded] = useState(false);
  const { currentStreak, isMilestone } = useStreak();
  const { summary: weeklySummary } = useWeeklySummary();
  const { isConnected: ouraConnected, todayData: ouraToday, activityIsLive, syncOura, syncing } = useOura();
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  // Initialize lastSynced from Oura data's created_at when data first loads
  React.useEffect(() => {
    if (ouraToday?.created_at && !lastSynced) {
      setLastSynced(new Date(ouraToday.created_at));
    }
  }, [ouraToday, lastSynced]);
  const { data: weeklyInsights } = useWeeklyInsights();
  const [showInsights, setShowInsights] = useState(false);

  // Quick-add supplement state
  const [suppQuickAdd, setSuppQuickAdd] = useState(false);
  const [suppName, setSuppName] = useState('');
  const [suppDosage, setSuppDosage] = useState('');
  const [suppTime, setSuppTime] = useState('morning');
  const [suppSaving, setSuppSaving] = useState(false);

  const handleQuickAddSupplement = async () => {
    if (!suppName.trim()) return;
    setSuppSaving(true);
    try {
      await addSupplement(suppName.trim(), suppDosage.trim(), suppTime);
      setSuppName('');
      setSuppDosage('');
      setSuppTime('morning');
      setSuppQuickAdd(false);
    } finally {
      setSuppSaving(false);
    }
  };

  // Check-in state
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [mood, setMood] = useState<number | null>(savedMood);
  const [energy, setEnergy] = useState<number | null>(savedEnergy);
  const [periodStatus, setPeriodStatus] = useState<string>('off');
  const [love, setLove] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<Map<SymptomType, number>>(new Map());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync saved values whenever the selected date's saved values change.
  // Important: set nulls too, otherwise navigating from a logged date to an
  // empty date leaves stale mood/energy selected in the form.
  React.useEffect(() => {
    setMood(savedMood);
    setEnergy(savedEnergy);
  }, [savedMood, savedEnergy]);

  // Sync existing symptom logs to chip state. Empty dates must clear the map.
  React.useEffect(() => {
    const map = new Map<SymptomType, number>();
    // DB stores severity as text ('mild'/'moderate'/'severe'), UI uses numbers 1-5
    const textToNum: Record<string, number> = { mild: 2, moderate: 3, severe: 4 };
    for (const log of symptomLogs) {
      const numSeverity = typeof log.severity === 'number'
        ? log.severity
        : (textToNum[String(log.severity)] ?? 3);
      map.set(log.symptom_type as SymptomType, numSeverity);
    }
    setSelectedSymptoms(map);
  }, [symptomLogs]);

  // Sync daily log data. Start from blank defaults so navigating to a date
  // without a daily_log does not preserve notes/period/love from another day.
  React.useEffect(() => {
    setPeriodStatus('off');
    setLove(false);
    setNotes('');

    if (dailyLog) {
      if (dailyLog.health_notes) {
        const hn = dailyLog.health_notes;
        if (!hn.startsWith('{') || !hn.includes('"skincare"')) {
          // Could still be JSON with just love field
          try {
            const parsed = JSON.parse(hn);
            if (typeof parsed === 'object' && parsed !== null) {
              setLove(Boolean(parsed.love));
              setNotes(parsed.userNotes ?? '');
            }
          } catch {
            // Plain text notes
            setNotes(hn);
          }
        } else {
          // Extract userNotes and love from skincare JSON
          try {
            const parsed = JSON.parse(hn);
            setNotes(parsed.userNotes ?? '');
            setLove(Boolean(parsed.love));
          } catch {
            // ignore parse errors
          }
        }
      }
    }

    // Spotting lives in period_logs because the legacy daily_logs constraint
    // does not accept it. Prefer the dedicated record when restoring the form.
    setPeriodStatus(dailyLogPeriodToPeriodStatus(periodLog?.flow ?? dailyLog?.period));
  }, [dailyLog, periodLog]);

  // Auto-collapse if already submitted
  const hasSubmittedToday = dailyLog !== null || savedMood !== null || periodLog !== null;

  const toggleSymptom = useCallback((type: SymptomType) => {
    setSelectedSymptoms((prev) => {
      const next = new Map(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.set(type, 3); // default severity
      }
      return next;
    });
  }, []);

  const updateSymptomSeverity = useCallback((type: SymptomType, severity: number) => {
    setSelectedSymptoms((prev) => {
      const next = new Map(prev);
      next.set(type, severity);
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    setSaveError(null);
    try {
      // Save mood + energy to symptoms table
      if (mood !== null && energy !== null) {
        await saveMoodEnergy({ mood, energy });
      }

      // Save period to period_logs
      await savePeriodFlow(periodStatusToPeriodLogFlow(periodStatus));

      // Save notes + love to daily_logs FIRST (most important — don't lose user's text)
      // Preserve skincare JSON if it exists in health_notes
      let healthNotesToSave: string | undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingLog } = await (supabase.from('daily_logs') as any)
        .select('health_notes')
        .eq('user_id', user.id)
        .eq('log_date', selectedDateKey)
        .maybeSingle();

      // Build JSON blob merging existing data with notes + love
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let blob: Record<string, any> = {};
      if (existingLog?.health_notes) {
        try {
          const parsed = JSON.parse(existingLog.health_notes as string);
          if (typeof parsed === 'object' && parsed !== null) {
            blob = parsed;
          }
        } catch {
          // Was plain text — will migrate to JSON
        }
      }
      if (notes) blob.userNotes = notes;
      else delete blob.userNotes;
      if (love) blob.love = true;
      else delete blob.love;

      // If blob only has userNotes and nothing else, store as plain text for backward compat
      const blobKeys = Object.keys(blob);
      if (blobKeys.length === 0) {
        healthNotesToSave = undefined;
      } else if (blobKeys.length === 1 && blobKeys[0] === 'userNotes') {
        healthNotesToSave = notes;
      } else {
        healthNotesToSave = JSON.stringify(blob);
      }

      await saveDailyLog({
        health_notes: healthNotesToSave,
        period: periodStatusToDailyLogPeriod(periodStatus),
      });

      // Sync symptoms: remove deselected, update existing, add new (non-blocking)
      try {
        const existingByType = new Map(
          symptomLogs.map((l) => [l.symptom_type as SymptomType, l]),
        );

        // Remove deselected symptoms
        for (const log of symptomLogs) {
          if (!selectedSymptoms.has(log.symptom_type as SymptomType)) {
            await removeSymptom(log.id);
          }
        }

        // Add new or update existing symptoms (including notes)
        for (const [type, severity] of selectedSymptoms) {
          const existing = existingByType.get(type);
          if (existing) {
            // Update severity and notes on existing symptom
            await updateSymptomLog(existing.id, { severity, notes: notes || undefined });
          } else {
            await addSymptom({ symptom_type: type, severity, notes: notes || undefined });
          }
        }
      } catch (symptomErr) {
        console.warn('Symptom save error (notes still saved):', symptomErr);
      }

      // Show "Saved!" confirmation briefly (May 7 UX)
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1800);
    } catch (err) {
      console.error('Check-in save failed:', err);
      setSaveError('Check-in did not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [
    user, mood, energy, periodStatus, love, selectedSymptoms, notes,
    saveMoodEnergy, savePeriodFlow, symptomLogs, removeSymptom, addSymptom, updateSymptomLog, saveDailyLog,
    selectedDateKey,
  ]);

  const hasFoodData = totals.calories > 0 || totals.protein > 0;
  const caloriePercent = Math.min((totals.calories / calorieTarget) * 100, 100);
  const proteinPercent = Math.min((totals.protein / proteinTarget) * 100, 100);

  return (
    <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Max-width wrapper */}
          <View style={styles.maxWidthWrap}>
            {/* Title + Settings */}
            <View style={styles.headerRow}>
              <View style={styles.headerSpacer} />
              <Text style={styles.title}>HEALTHY ME</Text>
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => router.push('/settings')}
                activeOpacity={0.7}
              >
                <Text style={styles.settingsIcon}>⚙️</Text>
              </TouchableOpacity>
            </View>

            {/* Date navigation (restored May 7) */}
            <DateNavigator
              selectedDate={selectedDate}
              isToday={isToday}
              onBack={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() - 1);
                setSelectedDate(d);
              }}
              onForward={() => {
                if (isToday) return;
                const d = new Date(selectedDate);
                d.setDate(d.getDate() + 1);
                setSelectedDate(d);
              }}
              onTapDate={() => setSelectedDate(new Date())}
            />

            {/* Character — centered, celebrating on milestones */}
            <View style={styles.characterWrap}>
              <Image
                source={
                  isMilestone
                    ? require('../../../assets/images/character/character-celebrating.png')
                    : require('../../../assets/images/character/character-default.png')
                }
                style={styles.character}
                resizeMode="contain"
              />
            </View>

            {/* Streak + Score Display */}
            {(currentStreak > 0 || dailyScoreValue > 0) && (
              <View style={styles.streakCard}>
                {currentStreak > 0 && (
                  <Text style={styles.streakText}>
                    🔥 {currentStreak} Day Streak!
                  </Text>
                )}
                {dailyScoreValue > 0 && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setScoreExpanded(!scoreExpanded)}
                    style={styles.scoreTouchable}
                  >
                    <View style={styles.scoreRow}>
                      <Text style={styles.scoreLabel}>Today</Text>
                      <View style={styles.scoreBarOuter}>
                        <View
                          style={[
                            styles.scoreBarInner,
                            { width: `${Math.min(dailyScoreValue, 100)}%` },
                            dailyScoreValue >= 50
                              ? styles.scoreBarGood
                              : styles.scoreBarLow,
                          ]}
                        />
                      </View>
                      <Text style={styles.scoreValue}>{dailyScoreValue}</Text>
                      <Text style={styles.collapseIcon}>
                        {scoreExpanded ? '▲' : '▼'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                {scoreExpanded && dailyBreakdown && (
                  <View style={styles.scoreBreakdown}>
                    {(
                      ['protein', 'calories', 'supplements', 'water', 'exercise', 'sleep', 'checkin'] as Array<keyof Omit<ScoreBreakdown, 'total'>>
                    ).map((key) => {
                      const cat = dailyBreakdown[key];
                      if (typeof cat === 'number' || cat.weight === 0) return null;
                      return (
                        <View key={key} style={styles.breakdownRow}>
                          <Text style={styles.breakdownEmoji}>{cat.emoji}</Text>
                          <Text style={styles.breakdownLabel}>{cat.label}</Text>
                          <View style={styles.breakdownBarOuter}>
                            <View
                              style={[
                                styles.breakdownBarInner,
                                { width: `${cat.raw}%` },
                                cat.raw >= 70 ? styles.scoreBarGood : cat.raw >= 40 ? styles.scoreBarLow : styles.breakdownBarLow,
                              ]}
                            />
                          </View>
                          <Text style={styles.breakdownValue}>+{cat.contribution}</Text>
                        </View>
                      );
                    })}
                    {dailyTips.length > 0 && (
                      <View style={styles.tipsWrap}>
                        {dailyTips.map((tip, i) => (
                          <Text key={i} style={styles.tipText}>{tip}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Oura Ring Summary */}
            {ouraConnected && ouraToday && (
              <View style={[styles.accentCard, styles.accentPurple, { marginBottom: Spacing.lg }]}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>💍 Oura Ring</Text>
                  <View style={styles.ouraSyncRow}>
                    {lastSynced && !syncing && (
                      <Text style={styles.syncedTimeText}>{formatSyncTime(lastSynced)}</Text>
                    )}
                    {syncing && <Text style={styles.syncedTimeText}>syncing...</Text>}
                    <TouchableOpacity
                      onPress={() => {
                        const today = toDateKey(new Date());
                        syncOura(today, today).then(() => setLastSynced(new Date())).catch(() => {});
                      }}
                      disabled={syncing}
                      style={styles.syncButton}
                      activeOpacity={0.6}
                    >
                      <Text style={[styles.syncButtonText, syncing && { opacity: 0.4 }]}>🔄</Text>
                    </TouchableOpacity>
                    {activityIsLive && (
                      <Text style={styles.progress}>📶 Live</Text>
                    )}
                  </View>
                </View>
                <View style={styles.weeklyGrid}>
                  {ouraToday.sleep_score != null && (
                    <View style={styles.weeklyStatRow}>
                      <Text style={styles.weeklyStatLabel}>Sleep</Text>
                      <Text style={styles.weeklyStatValue}>{ouraToday.sleep_score}/100</Text>
                    </View>
                  )}
                  {ouraToday.readiness_score != null && (
                    <View style={styles.weeklyStatRow}>
                      <Text style={styles.weeklyStatLabel}>Readiness</Text>
                      <Text style={styles.weeklyStatValue}>{ouraToday.readiness_score}/100</Text>
                    </View>
                  )}
                  {ouraToday.hrv_average != null && (
                    <View style={styles.weeklyStatRow}>
                      <Text style={styles.weeklyStatLabel}>HRV</Text>
                      <Text style={styles.weeklyStatValue}>{Math.round(ouraToday.hrv_average)} ms</Text>
                    </View>
                  )}
                  {ouraToday.resting_hr != null && (
                    <View style={styles.weeklyStatRow}>
                      <Text style={styles.weeklyStatLabel}>Resting HR</Text>
                      <Text style={styles.weeklyStatValue}>{Math.round(ouraToday.resting_hr)} bpm</Text>
                    </View>
                  )}
                  {(() => {
                    const { steps: bestSteps, isEstimated } = getBestSteps(ouraToday);
                    return bestSteps != null ? (
                      <View style={styles.weeklyStatRow}>
                        <Text style={styles.weeklyStatLabel}>Steps</Text>
                        <Text style={styles.weeklyStatValue}>
                          {isEstimated ? '~' : ''}{bestSteps.toLocaleString()}
                        </Text>
                      </View>
                    ) : null;
                  })()}
                  {ouraToday.active_calories != null && (
                    <View style={styles.weeklyStatRow}>
                      <Text style={styles.weeklyStatLabel}>🔥 Burned</Text>
                      <Text style={styles.weeklyStatValue}>{Math.round(ouraToday.active_calories)}</Text>
                    </View>
                  )}
                  {ouraToday.activity_score != null ? (
                    <View style={styles.weeklyStatRow}>
                      <Text style={styles.weeklyStatLabel}>Activity</Text>
                      <Text style={styles.weeklyStatValue}>{Math.round(ouraToday.activity_score)}/100</Text>
                    </View>
                  ) : (ouraToday.steps != null || ouraToday.active_calories != null) ? (
                    <View style={styles.weeklyStatRow}>
                      <Text style={styles.weeklyStatLabel}>Activity</Text>
                      <Text style={[styles.weeklyStatValue, { color: Colors.textMuted }]}>Score updates tonight</Text>
                    </View>
                  ) : null}

                </View>
                {lastSynced && (
                  <Text style={styles.ouraUpdatedText}>
                    Updated: {lastSynced.toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </Text>
                )}
              </View>
            )}

            {/* Calorie Balance */}
            <View style={{ marginBottom: Spacing.lg }}>
              <CalorieBalanceCard
                calories={totals.calories}
                calorieTarget={calorieTarget}
                protein={totals.protein}
                proteinTarget={proteinTarget}
              />
            </View>

            {/* Weekly Summary */}
            {weeklySummary && weeklySummary.daysTracked > 0 && (
              <View style={[styles.accentCard, styles.accentPurple, { marginBottom: Spacing.lg }]}>
                <Text style={styles.sectionTitle}>📊 This Week</Text>
                <View style={styles.weeklyGrid}>
                  <View style={styles.weeklyStatRow}>
                    <Text style={styles.weeklyStatLabel}>Avg Score</Text>
                    <Text style={styles.weeklyStatValue}>{weeklySummary.avgDailyScore}/100</Text>
                  </View>
                  <View style={styles.weeklyStatRow}>
                    <Text style={styles.weeklyStatLabel}>Exercise</Text>
                    <Text style={styles.weeklyStatValue}>{weeklySummary.totalExerciseMinutes} min</Text>
                  </View>
                  <View style={styles.weeklyStatRow}>
                    <Text style={styles.weeklyStatLabel}>Avg Calories</Text>
                    <Text style={styles.weeklyStatValue}>{weeklySummary.avgCalories}</Text>
                  </View>
                  <View style={styles.weeklyStatRow}>
                    <Text style={styles.weeklyStatLabel}>Avg Protein</Text>
                    <Text style={styles.weeklyStatValue}>{weeklySummary.avgProtein}g</Text>
                  </View>
                  <View style={styles.weeklyStatRow}>
                    <Text style={styles.weeklyStatLabel}>Supplements</Text>
                    <Text style={styles.weeklyStatValue}>{weeklySummary.supplementAdherencePct}%</Text>
                  </View>
                  {weeklySummary.currentStreak > 0 && (
                    <View style={styles.weeklyStatRow}>
                      <Text style={styles.weeklyStatLabel}>Streak</Text>
                      <Text style={styles.weeklyStatValue}>🔥 {weeklySummary.currentStreak} days</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Weekly Insights */}
            {weeklyInsights && weeklyInsights.insights.length > 0 && (
              <WeeklyInsightsCard
                data={weeklyInsights}
                showInsights={showInsights}
                setShowInsights={setShowInsights}
              />
            )}

            {/* Content cards */}
            <View style={styles.contentWrap}>
            {/* Water Tracker */}
            <WaterTracker date={selectedDate} />

            {/* Supplement Checklist */}
            <View style={[styles.accentCard, styles.accentGreen]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  💊 Supplements
                </Text>
                  <Text style={styles.progress}>
                    {supplementsLoading ? '...' : `${takenCount}/${totalCount} done`}
                  </Text>
                </View>

                {supplementsLoading ? (
                  <ActivityIndicator color={Colors.purple} />
                ) : (
                  <>
                    <SupplementGroup
                      title="☀️ Morning"
                      items={morningSupplements}
                      isChecked={isSupplementTaken}
                      onToggle={toggleSupplement}
                    />
                    <SupplementGroup
                      title="🌙 Evening"
                      items={eveningSupplements}
                      isChecked={isSupplementTaken}
                      onToggle={toggleSupplement}
                    />

                    {suppQuickAdd ? (
                      <View style={styles.quickAddForm}>
                        <TextInput
                          style={styles.quickAddInput}
                          value={suppName}
                          onChangeText={setSuppName}
                          placeholder="Name (e.g. Vitamin D)"
                          placeholderTextColor={Colors.textMuted}
                          autoFocus
                        />
                        <TextInput
                          style={styles.quickAddInput}
                          value={suppDosage}
                          onChangeText={setSuppDosage}
                          placeholder="Dosage (e.g. 500mg)"
                          placeholderTextColor={Colors.textMuted}
                        />
                        <View style={styles.quickAddTimeRow}>
                          <TouchableOpacity
                            style={[styles.quickAddTimePill, suppTime === 'morning' && styles.quickAddTimePillActive]}
                            onPress={() => setSuppTime('morning')}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.quickAddTimePillText, suppTime === 'morning' && styles.quickAddTimePillTextActive]}>
                              ☀️ Morning
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.quickAddTimePill, suppTime === 'evening' && styles.quickAddTimePillActive]}
                            onPress={() => setSuppTime('evening')}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.quickAddTimePillText, suppTime === 'evening' && styles.quickAddTimePillTextActive]}>
                              🌙 Evening
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.quickAddButtons}>
                          <TouchableOpacity
                            onPress={() => {
                              setSuppQuickAdd(false);
                              setSuppName('');
                              setSuppDosage('');
                              setSuppTime('morning');
                            }}
                            style={styles.quickAddCancel}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.quickAddCancelText}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={handleQuickAddSupplement}
                            disabled={suppSaving || !suppName.trim()}
                            style={[styles.quickAddSave, (!suppName.trim() || suppSaving) && styles.quickAddSaveDisabled]}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.quickAddSaveText}>
                              {suppSaving ? 'Adding...' : 'Add'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => setSuppQuickAdd(true)}
                        style={styles.quickAddTrigger}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.quickAddTriggerText}>+ Add</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
            </View>

            {/* Calf Recovery Tracker */}
            <CalfTrackerCard />

            {/* Zepbound logging follows Home's selected-day workflow. */}
            <DailyZepboundLogCard date={selectedDate} />

            {/* Food Summary */}
            <View style={[styles.accentCard, styles.accentOrange]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🍽️ Today&apos;s Food</Text>
                <Text style={styles.progress}>
                  {hasFoodData ? `${totals.calories} / ${calorieTarget} cal` : ''}
                </Text>
              </View>
              {hasFoodData ? (
                <View style={styles.progressSection}>
                  <View style={styles.progressRow}>
                    <Text style={styles.progressLabel}>Calories</Text>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, styles.progressFillOrange, { width: `${caloriePercent}%` }]} />
                    </View>
                    <Text style={styles.progressValue}>{totals.calories}</Text>
                  </View>
                  <View style={styles.progressRow}>
                    <Text style={styles.progressLabel}>Protein</Text>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, styles.progressFillPurple, { width: `${proteinPercent}%` }]} />
                    </View>
                    <Text style={styles.progressValue}>{totals.protein}g</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.emptyText}>No meals logged yet 🍽️</Text>
              )}
            </View>

            {/* Daily Check-in */}
            <DailyCheckinCard
              checkinOpen={checkinOpen}
              setCheckinOpen={setCheckinOpen}
              hasSubmittedToday={hasSubmittedToday}
              savedMood={savedMood}
              savedEnergy={savedEnergy}
              mood={mood}
              setMood={setMood}
              energy={energy}
              setEnergy={setEnergy}
              periodStatus={periodStatus}
              setPeriodStatus={setPeriodStatus}
              love={love}
              setLove={setLove}
              selectedSymptoms={selectedSymptoms}
              toggleSymptom={toggleSymptom}
              updateSymptomSeverity={updateSymptomSeverity}
              notes={notes}
              setNotes={setNotes}
              saving={saving}
              justSaved={justSaved}
              saveError={saveError}
              onSave={handleSave}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  maxWidthWrap: {
    width: '100%',
    maxWidth: 430,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
  },

  // Header row
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  headerSpacer: {
    width: 36,
  },
  settingsButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    fontSize: 22,
  },

  // Title
  title: {
    flex: 1,
    fontFamily: Fonts.pixel,
    fontSize: FontSizes.lg,
    color: Colors.purple,
    textAlign: 'center',
  },

  // Date
  date: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },

  // Character — centered
  characterWrap: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  character: {
    width: 80,
    height: 96,
  },

  // Streak + Score
  streakCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(124, 77, 255, 0.06)',
      },
      default: {
        shadowColor: '#7c4dff',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  streakText: {
    fontFamily: Fonts.pixel,
    fontSize: FontSizes.sm,
    color: Colors.purple,
    textAlign: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    width: '100%',
  },
  scoreLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
    flexShrink: 0,
    minWidth: 42,
  },
  scoreBarOuter: {
    flex: 1,
    height: 8,
    backgroundColor: '#F0EAF8',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarInner: {
    height: '100%',
    borderRadius: 4,
  },
  scoreBarGood: {
    backgroundColor: Colors.success,
  },
  scoreBarLow: {
    backgroundColor: Colors.warning,
  },
  scoreValue: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textPrimary,
    width: 28,
    textAlign: 'right',
  },
  scoreTouchable: {
    width: '100%',
  },
  scoreBreakdown: {
    width: '100%',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.tabBarBorder,
    gap: Spacing.xs,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  breakdownEmoji: {
    fontSize: 14,
    width: 20,
    textAlign: 'center',
  },
  breakdownLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
    width: 70,
  },
  breakdownBarOuter: {
    flex: 1,
    height: 6,
    backgroundColor: '#F0EAF8',
    borderRadius: 3,
    overflow: 'hidden',
  },
  breakdownBarInner: {
    height: '100%',
    borderRadius: 3,
  },
  breakdownBarLow: {
    backgroundColor: Colors.error,
  },
  breakdownValue: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.purple,
    width: 24,
    textAlign: 'right',
  },
  tipsWrap: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  tipText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.purple,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Weekly Insights
  insightsMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  insightMetric: {
    flex: 1,
    alignItems: 'center',
  },
  insightMetricValue: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.purple,
  },
  insightMetricLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  insightsList: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: 'rgba(124, 77, 255, 0.06)',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  insightEmoji: {
    fontSize: 18,
    marginTop: 1,
  },
  insightText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
    flex: 1,
    lineHeight: 18,
  },
  viewInsightsBtn: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.purple,
    textAlign: 'center',
    marginTop: Spacing.sm,
    opacity: 0.8,
  },

  // Content wrapper
  contentWrap: {
    width: '100%',
    gap: Spacing.lg,
  },

  // Accent cards with colored left border
  accentCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    padding: Spacing.md,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(124, 77, 255, 0.06)',
      },
      default: {
        shadowColor: '#7c4dff',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  accentGreen: {
    borderLeftColor: '#81c784',
  },
  accentOrange: {
    borderLeftColor: '#ffb74d',
  },
  accentBlue: {
    borderLeftColor: Colors.babyBlue,
  },
  accentPink: {
    borderLeftColor: '#f48fb1',
  },
  accentPurple: {
    borderLeftColor: Colors.purple,
  },

  // Oura sync
  ouraSyncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  syncedTimeText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
  },
  syncButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncButtonText: {
    fontSize: 16,
  },
  ouraUpdatedText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },

  // Weekly summary
  weeklyGrid: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  weeklyStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  weeklyStatLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
  },
  weeklyStatValue: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
  },

  // Progress bars (Food section)
  progressSection: {
    gap: Spacing.sm,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  progressLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
    width: 55,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#F0EAF8',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressFillOrange: {
    backgroundColor: '#ffb74d',
  },
  progressFillPurple: {
    backgroundColor: Colors.purple,
  },
  progressValue: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textPrimary,
    width: 40,
    textAlign: 'right',
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },



  // Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.textPrimary,
  },
  progress: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.purple,
  },

  // Supplement date navigation
  suppDateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  suppNavArrow: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suppNavArrowDisabled: {
    opacity: 0.3,
  },
  suppNavArrowText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.purple,
  },
  suppNavArrowTextDisabled: {
    color: Colors.textMuted,
  },
  suppDateText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    minWidth: 80,
    textAlign: 'center',
  },

  // Supplement groups
  supplementGroup: {
    marginBottom: Spacing.md,
  },
  groupLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  checklistGap: {
    gap: Spacing.sm,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    padding: Spacing.md,
  },
  checkRowDone: {
    backgroundColor: 'rgba(129, 199, 132, 0.15)',
    borderColor: 'rgba(129, 199, 132, 0.3)',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  checkboxDone: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  checkmark: {
    fontFamily: Fonts.body,
    fontSize: 7,
    color: Colors.textOnDark,
  },
  suppIcon: {
    width: 20,
    height: 20,
    marginRight: Spacing.sm,
  },
  checkLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    flex: 1,
  },
  checkLabelDone: {
    color: Colors.textSecondary,
  },

  // Check-in
  checkinHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  collapseIcon: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
  },
  checkinBody: {
    marginTop: Spacing.lg,
  },

  // Field groups
  fieldGroup: {
    marginBottom: Spacing.lg,
  },
  fieldLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },

  // Emoji picker
  emojiRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  emojiButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiButtonSelected: {
    borderColor: Colors.purple,
    backgroundColor: Colors.softPurple,
  },
  emojiText: {
    fontSize: 24,
  },

  // Period
  periodRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  periodPill: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
  },
  periodPillOff: {
    backgroundColor: Colors.softPurple,
    borderColor: Colors.purple,
  },
  periodPillOn: {
    backgroundColor: Colors.pink,
    borderColor: Colors.pink,
  },
  periodPillText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
  },
  periodPillTextActive: {
    color: Colors.textOnDark,
  },

  // Love toggle
  lovePill: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
  },
  lovePillActive: {
    backgroundColor: Colors.pink,
    borderColor: Colors.pink,
  },
  lovePillText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
  },
  lovePillTextActive: {
    color: Colors.textOnDark,
  },

  // Symptom chips
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  chip: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
  },
  chipActive: {
    backgroundColor: Colors.softPurple,
    borderColor: Colors.purple,
  },
  chipText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
  },
  chipTextActive: {
    color: Colors.purple,
  },

  // Severity
  severitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  severityLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
    flex: 1,
  },
  severityRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  severityDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  severityDotActive: {
    backgroundColor: Colors.purple,
    borderColor: Colors.purple,
  },
  severityDotText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
  },
  severityDotTextActive: {
    color: Colors.textOnDark,
  },

  // Quick-add supplement
  quickAddTrigger: {
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.purple,
    backgroundColor: 'transparent',
  },
  quickAddTriggerText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.purple,
  },
  quickAddForm: {
    marginTop: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
  },
  quickAddInput: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    padding: Spacing.sm,
  },
  quickAddTimeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  quickAddTimePill: {
    flex: 1,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    alignItems: 'center',
  },
  quickAddTimePillActive: {
    backgroundColor: Colors.purple,
    borderColor: Colors.purple,
  },
  quickAddTimePillText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
  },
  quickAddTimePillTextActive: {
    color: Colors.textOnDark,
  },
  quickAddButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  quickAddCancel: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  quickAddCancelText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
  },
  quickAddSave: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.purple,
    borderRadius: BorderRadius.full,
  },
  quickAddSaveDisabled: {
    opacity: 0.4,
  },
  quickAddSaveText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textOnDark,
  },

  // Notes
  notesInput: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    padding: Spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
