import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { ExerciseLog } from '../types/database';

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

interface AddExerciseInput {
  exercise_type: string;
  duration_minutes: number | null;
  calories_burned: number | null;
}

export function useExercises() {
  const { user } = useAuth();
  const [todaysExercises, setTodaysExercises] = useState<ExerciseLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTodaysExercises = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exercise_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('log_date', getTodayDate())
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTodaysExercises((data as ExerciseLog[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTodaysExercises();
  }, [fetchTodaysExercises]);

  const addExercise = useCallback(
    async (exercise: AddExerciseInput) => {
      if (!user) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
      const { error } = await (supabase.from('exercise_logs') as any).insert({
        user_id: user.id,
        log_date: getTodayDate(),
        exercise_type: exercise.exercise_type,
        duration_minutes: exercise.duration_minutes,
        calories_burned: exercise.calories_burned,
        intensity: null,
        sleep_score: null,
        activity_score: null,
        steps: null,
        notes: null,
      });
      if (error) throw error;
      await fetchTodaysExercises();
    },
    [user, fetchTodaysExercises],
  );

  const deleteExercise = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from('exercise_logs')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await fetchTodaysExercises();
    },
    [fetchTodaysExercises],
  );

  return {
    todaysExercises,
    loading,
    addExercise,
    deleteExercise,
    refetch: fetchTodaysExercises,
  };
}
