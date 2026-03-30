import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { getCurrentWeekRange } from '../utils/storage';
import type { ExerciseLog } from '../types/database';

export const EXERCISE_TYPES = [
  'Pilates',
  'Lagree',
  'Walking',
  'Running',
  'Yoga',
  'Strength Training',
  'Swimming',
  'Cycling',
  'Dance',
  'Other',
] as const;

export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export type Intensity = 'low' | 'moderate' | 'high';

interface AddExerciseInput {
  exercise_type: string;
  duration_minutes: number | null;
  calories_burned?: number | null;
  intensity: Intensity | null;
  notes?: string | null;
}

export function useExerciseLog(date: string) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ExerciseLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('exercise_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', date)
      .order('created_at', { ascending: true });

    if (!error && data) setEntries(data as ExerciseLog[]);
    setLoading(false);
  }, [user, date]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useFocusEffect(
    useCallback(() => {
      fetchEntries();
    }, [fetchEntries])
  );

  const addEntry = async (entry: AddExerciseInput) => {
    if (!user) return { error: new Error('Not authenticated') };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exerciseTable = supabase.from('exercise_logs') as any;
    const { error } = await exerciseTable.insert({
      user_id: user.id,
      log_date: date,
      exercise_type: entry.exercise_type,
      duration_minutes: entry.duration_minutes,
      calories_burned: entry.calories_burned ?? null,
      intensity: entry.intensity,
      notes: entry.notes ?? null,
      sleep_score: null,
      activity_score: null,
      steps: null,
    }).select().single();

    if (!error) await fetchEntries();
    return { error };
  };

  const deleteEntry = async (id: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('exercise_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (!error) await fetchEntries();
  };

  const totals = entries.reduce(
    (acc, e) => ({
      minutes: acc.minutes + (e.duration_minutes ?? 0),
      calories: acc.calories + (e.calories_burned ?? 0),
      sessions: acc.sessions + 1,
    }),
    { minutes: 0, calories: 0, sessions: 0 },
  );

  return { entries, loading, addEntry, deleteEntry, totals, refresh: fetchEntries };
}

/**
 * Hook for weekly exercise summary.
 * Returns totals for the current week (Monday–Sunday).
 */
export function useWeeklyExerciseSummary() {
  const { user } = useAuth();
  const [weeklyTotals, setWeeklyTotals] = useState({
    minutes: 0,
    sessions: 0,
    calories: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchWeekly = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { mondayKey, sundayKey } = getCurrentWeekRange();

    const { data, error } = await supabase
      .from('exercise_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('log_date', mondayKey)
      .lte('log_date', sundayKey);

    if (!error && data) {
      const entries = data as ExerciseLog[];
      setWeeklyTotals({
        minutes: entries.reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0),
        sessions: entries.length,
        calories: entries.reduce((sum, e) => sum + (e.calories_burned ?? 0), 0),
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchWeekly();
  }, [fetchWeekly]);

  useFocusEffect(
    useCallback(() => {
      fetchWeekly();
    }, [fetchWeekly])
  );

  return { weeklyTotals, loading, refresh: fetchWeekly };
}
