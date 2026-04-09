import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { toDateKey } from '../utils/storage';
import { useDebouncedFocusEffect } from './use-debounced-focus';

export interface WeeklySummary {
  avgDailyScore: number;
  totalExerciseMinutes: number;
  avgCalories: number;
  avgProtein: number;
  supplementAdherencePct: number;
  currentStreak: number;
  daysTracked: number;
}

/**
 * Returns Monday of the current week.
 */
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const offset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns Sunday of the current week.
 */
function getSunday(monday: Date): Date {
  const d = new Date(monday);
  d.setDate(d.getDate() + 6);
  return d;
}

export function useWeeklySummary() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const now = new Date();
      const monday = getMonday(now);
      const sunday = getSunday(monday);
      const mondayKey = toDateKey(monday);
      const sundayKey = toDateKey(sunday);

      // Fetch all data in parallel
      const [scoresRes, exerciseRes, ouraWorkoutsRes, foodRes, supplementsRes, supplementLogsRes] =
        await Promise.all([
          // Daily scores for the week
          supabase
            .from('daily_scores')
            .select('total_score, score_date')
            .eq('user_id', user.id)
            .gte('score_date', mondayKey)
            .lte('score_date', sundayKey),
          // Exercise logs for the week (manual entries)
          supabase
            .from('exercise_logs')
            .select('duration_minutes')
            .eq('user_id', user.id)
            .gte('log_date', mondayKey)
            .lte('log_date', sundayKey),
          // Oura workouts for the week (exclude housework)
          supabase
            .from('oura_workouts')
            .select('duration_minutes')
            .eq('user_id', user.id)
            .gte('log_date', mondayKey)
            .lte('log_date', sundayKey)
            .neq('activity_type', 'houseWork'),
          // Food logs for the week
          supabase
            .from('food_logs')
            .select('calories, protein, log_date')
            .eq('user_id', user.id)
            .gte('log_date', mondayKey)
            .lte('log_date', sundayKey),
          // Total active supplements
          supabase
            .from('user_supplements')
            .select('id')
            .eq('user_id', user.id)
            .eq('is_active', true),
          // Supplement logs for the week
          supabase
            .from('supplement_logs')
            .select('taken, log_date')
            .eq('user_id', user.id)
            .gte('log_date', mondayKey)
            .lte('log_date', sundayKey),
        ]);

      // --- Daily scores ---
      const scores = (scoresRes.data ?? []) as Array<{
        total_score: number;
        score_date: string;
      }>;
      const daysTracked = scores.length;
      const avgDailyScore =
        daysTracked > 0
          ? Math.round(
              scores.reduce((s, r) => s + r.total_score, 0) / daysTracked,
            )
          : 0;

      // --- Exercise (manual + Oura workouts) ---
      const exercises = (exerciseRes.data ?? []) as Array<{
        duration_minutes: number | null;
      }>;
      const manualMinutes = exercises.reduce(
        (s, e) => s + (e.duration_minutes ?? 0),
        0,
      );
      const ouraWorkouts = (ouraWorkoutsRes.data ?? []) as Array<{
        duration_minutes: number | null;
      }>;
      const ouraMinutes = ouraWorkouts.reduce(
        (s, e) => s + (e.duration_minutes ?? 0),
        0,
      );
      const totalExerciseMinutes = manualMinutes + ouraMinutes;

      // --- Food: average per day that has logs ---
      const foodRows = (foodRes.data ?? []) as Array<{
        calories: number | null;
        protein: number | null;
        log_date: string;
      }>;
      const foodByDay = new Map<string, { cal: number; prot: number }>();
      for (const row of foodRows) {
        const existing = foodByDay.get(row.log_date) ?? { cal: 0, prot: 0 };
        existing.cal += row.calories ?? 0;
        existing.prot += row.protein ?? 0;
        foodByDay.set(row.log_date, existing);
      }
      const foodDays = foodByDay.size;
      const totalCal = Array.from(foodByDay.values()).reduce(
        (s, v) => s + v.cal,
        0,
      );
      const totalProt = Array.from(foodByDay.values()).reduce(
        (s, v) => s + v.prot,
        0,
      );
      const avgCalories = foodDays > 0 ? Math.round(totalCal / foodDays) : 0;
      const avgProtein = foodDays > 0 ? Math.round(totalProt / foodDays) : 0;

      // --- Supplements adherence ---
      const totalSupplements = supplementsRes.data?.length ?? 0;
      const suppLogs = (supplementLogsRes.data ?? []) as Array<{
        taken: boolean;
        log_date: string;
      }>;
      // Count unique days with any supplement activity
      const suppDays = new Set(suppLogs.map((l) => l.log_date)).size;
      const totalPossible = totalSupplements * Math.max(suppDays, 1);
      const takenTotal = suppLogs.filter((l) => l.taken).length;
      const supplementAdherencePct =
        totalPossible > 0
          ? Math.round((takenTotal / totalPossible) * 100)
          : 0;

      // --- Streak (reuse from daily_scores, count backward) ---
      const scoreMap = new Map<string, number>();
      for (const row of scores) {
        scoreMap.set(row.score_date, row.total_score);
      }
      let streak = 0;
      const cursor = new Date(now);
      for (let i = 0; i < 31; i++) {
        const key = toDateKey(cursor);
        const dayScore = scoreMap.get(key);
        if (dayScore === undefined) {
          if (i === 0) {
            cursor.setDate(cursor.getDate() - 1);
            continue;
          }
          break;
        }
        if (dayScore >= 30) {
          streak++;
        } else {
          if (i === 0) {
            cursor.setDate(cursor.getDate() - 1);
            continue;
          }
          break;
        }
        cursor.setDate(cursor.getDate() - 1);
      }

      setSummary({
        avgDailyScore,
        totalExerciseMinutes,
        avgCalories,
        avgProtein,
        supplementAdherencePct,
        currentStreak: streak,
        daysTracked,
      });
    } catch (err) {
      console.error('Failed to fetch weekly summary:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useDebouncedFocusEffect(
    () => { fetchSummary(); },
    [fetchSummary],
  );

  return { summary, loading, refresh: fetchSummary };
}
