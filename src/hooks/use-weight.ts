import { toDateKey } from '../utils/storage';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { WeightLog } from '../types/database';

export function useWeight() {
  const { user } = useAuth();
  const [lastWeight, setLastWeight] = useState<WeightLog | null>(null);
  const [todayWeight, setTodayWeight] = useState<WeightLog | null>(null);
  const [recentWeights, setRecentWeights] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(true);

  const today = toDateKey(new Date());

  const fetchLastWeight = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [lastRes, todayRes, recentRes] = await Promise.all([
        supabase
          .from('weight_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('log_date', { ascending: false })
          .limit(1),
        supabase
          .from('weight_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('log_date', today)
          .maybeSingle(),
        supabase
          .from('weight_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('log_date', { ascending: false })
          .limit(10),
      ]);

      if (lastRes.error) throw lastRes.error;
      setLastWeight(
        lastRes.data && lastRes.data.length > 0
          ? (lastRes.data[0] as WeightLog)
          : null,
      );
      setTodayWeight(
        todayRes.data ? (todayRes.data as WeightLog) : null,
      );
      setRecentWeights(
        recentRes.data ? (recentRes.data as WeightLog[]) : [],
      );
    } finally {
      setLoading(false);
    }
  }, [user, today]);

  useEffect(() => {
    fetchLastWeight();
  }, [fetchLastWeight]);

  const logWeight = useCallback(
    async (weight: number) => {
      if (!user) return;

      if (todayWeight) {
        // Update existing entry for today
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
        const { error } = await (supabase.from('weight_logs') as any)
          .update({ weight })
          .eq('id', todayWeight.id);
        if (error) throw error;
      } else {
        // Insert new entry
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
        const { error } = await (supabase.from('weight_logs') as any).insert({
          user_id: user.id,
          log_date: today,
          weight,
          notes: null,
        });
        if (error) throw error;
      }

      await fetchLastWeight();
    },
    [user, today, todayWeight, fetchLastWeight],
  );

  return { lastWeight, todayWeight, recentWeights, loading, logWeight, refetch: fetchLastWeight };
}
