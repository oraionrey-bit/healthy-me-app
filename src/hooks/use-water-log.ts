import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useUserProfile } from './use-user-profile';
import { toDateKey } from '../utils/storage';

const DEFAULT_WATER_GOAL = 8; // 8 glasses (250ml each = 2000ml)

/**
 * useWaterLog — water tracking for a given day.
 *
 * `date` defaults to today (May 7 bundle: hook accepts `date?: Date`).
 */
export function useWaterLog(date: Date = new Date()) {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const [glasses, setGlasses] = useState(0);
  const [loading, setLoading] = useState(true);

  const dateKey = useMemo(() => toDateKey(date), [date]);
  const waterGoal = profile?.water_target ?? DEFAULT_WATER_GOAL;
  const waterMl = glasses * 250;
  const waterGoalMl = waterGoal * 250;

  const fetchWater = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('water_logs')
        .select('glasses')
        .eq('user_id', user.id)
        .eq('log_date', dateKey)
        .maybeSingle();

      if (!error && data) {
        setGlasses((data as { glasses: number }).glasses);
      } else {
        setGlasses(0);
      }
    } finally {
      setLoading(false);
    }
  }, [user, dateKey]);

  useEffect(() => {
    fetchWater();
  }, [fetchWater]);

  const addWater = useCallback(
    async (extraGlasses: number) => {
      if (!user) return;
      const newTotal = glasses + extraGlasses;

      // Optimistic update
      setGlasses(newTotal);

      // Check if row exists
      const { data: existing } = await supabase
        .from('water_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('log_date', dateKey)
        .maybeSingle();

      let error;
      if (existing) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
        ({ error } = await (supabase.from('water_logs') as any)
          .update({ glasses: newTotal })
          .eq('id', (existing as { id: string }).id));
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
        ({ error } = await (supabase.from('water_logs') as any).insert({
          user_id: user.id,
          log_date: dateKey,
          glasses: newTotal,
        }));
      }
      if (error) {
        console.warn('Failed to save water log:', error);
        setGlasses(glasses); // Revert optimistic update
      }
    },
    [user, glasses, dateKey],
  );

  const resetWater = useCallback(async () => {
    if (!user) return;
    setGlasses(0);

    const { data: existing } = await supabase
      .from('water_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('log_date', dateKey)
      .maybeSingle();

    if (existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
      const { error } = await (supabase.from('water_logs') as any)
        .update({ glasses: 0 })
        .eq('id', (existing as { id: string }).id);
      if (error) {
        console.warn('Failed to reset water log:', error);
        await fetchWater(); // Re-fetch to get correct state
      }
    }
  }, [user, dateKey, fetchWater]);

  return {
    glasses,
    waterMl,
    waterGoal,
    waterGoalMl,
    loading,
    addWater,
    resetWater,
  };
}
