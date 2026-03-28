import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { OuraWorkout } from '../types/database';

/**
 * Map Oura activity type strings to our exercise types.
 * Oura uses sport type codes like "walking", "running", "pilates", etc.
 */
const OURA_TO_EXERCISE_MAP: Record<string, string> = {
  walking: 'Walking',
  running: 'Running',
  cycling: 'Cycling',
  swimming: 'Swimming',
  yoga: 'Yoga',
  pilates: 'Pilates',
  dancing: 'Dance',
  strength_training: 'Strength Training',
  weight_training: 'Strength Training',
  hiit: 'Strength Training',
  other: 'Other',
};

export function mapOuraActivity(ouraType: string | null): string {
  if (!ouraType) return 'Other';
  const lower = ouraType.toLowerCase().replace(/\s+/g, '_');
  return OURA_TO_EXERCISE_MAP[lower] ?? ouraType;
}

export function useOuraWorkouts(date: string) {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<OuraWorkout[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkouts = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('oura_workouts')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', date)
      .order('start_time', { ascending: true });

    if (!error && data) {
      setWorkouts(data as OuraWorkout[]);
    }
    setLoading(false);
  }, [user, date]);

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  useFocusEffect(
    useCallback(() => {
      fetchWorkouts();
    }, [fetchWorkouts])
  );

  const totals = workouts.reduce(
    (acc, w) => ({
      minutes: acc.minutes + (w.duration_minutes ?? 0),
      calories: acc.calories + (w.calories ?? 0),
      sessions: acc.sessions + 1,
    }),
    { minutes: 0, calories: 0, sessions: 0 },
  );

  return { workouts, loading, totals, refresh: fetchWorkouts };
}

/**
 * Hook for weekly Oura workout summary.
 */
export function useWeeklyOuraWorkouts() {
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

    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const mondayKey = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const sundayKey = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('oura_workouts')
      .select('*')
      .eq('user_id', user.id)
      .gte('log_date', mondayKey)
      .lte('log_date', sundayKey);

    if (!error && data) {
      const entries = data as OuraWorkout[];
      setWeeklyTotals({
        minutes: entries.reduce((sum, w) => sum + (w.duration_minutes ?? 0), 0),
        sessions: entries.length,
        calories: entries.reduce((sum, w) => sum + (w.calories ?? 0), 0),
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
