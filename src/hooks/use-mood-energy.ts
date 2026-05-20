import { toDateKey } from '../utils/storage';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { Symptom } from '../types/database';

interface SaveMoodEnergyInput {
  mood: number; // 1-5
  energy: number; // 1-5
}

/**
 * useMoodEnergy — mood/energy row for a given day.
 *
 * `date` defaults to today (May 7 bundle: hook accepts `date?: Date`).
 */
export function useMoodEnergy(date: Date = new Date()) {
  const { user } = useAuth();
  const [todaySymptom, setTodaySymptom] = useState<Symptom | null>(null);
  const [loading, setLoading] = useState(true);
  const dateKey = useMemo(() => toDateKey(date), [date]);

  const fetchTodaySymptom = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('symptoms')
        .select('*')
        .eq('user_id', user.id)
        .eq('log_date', dateKey)
        .maybeSingle();

      if (error) throw error;
      setTodaySymptom((data as Symptom | null) ?? null);
    } finally {
      setLoading(false);
    }
  }, [user, dateKey]);

  useEffect(() => {
    fetchTodaySymptom();
  }, [fetchTodaySymptom]);

  const saveMoodEnergy = useCallback(
    async (input: SaveMoodEnergyInput) => {
      if (!user) return;

      if (todaySymptom) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
        const { error } = await (supabase.from('symptoms') as any)
          .update({
            mood: input.mood,
            energy_level: input.energy,
          })
          .eq('id', todaySymptom.id);
        if (error) throw error;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
        const { error } = await (supabase.from('symptoms') as any).insert({
          user_id: user.id,
          log_date: dateKey,
          bloating: 0,
          acne: 0,
          hair_loss: 0,
          hirsutism: 0,
          fatigue: 0,
          brain_fog: 0,
          cravings: 0,
          anxiety: 0,
          mood: input.mood,
          energy_level: input.energy,
          notes: null,
        });
        if (error) throw error;
      }

      await fetchTodaySymptom();
    },
    [user, todaySymptom, dateKey, fetchTodaySymptom],
  );

  return {
    mood: todaySymptom?.mood ?? null,
    energy: todaySymptom?.energy_level ?? null,
    loading,
    saveMoodEnergy,
    refetch: fetchTodaySymptom,
  };
}
