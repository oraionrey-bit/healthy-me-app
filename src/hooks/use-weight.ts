import { toDateKey } from '../utils/storage';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { WeightLog } from '../types/database';

/**
 * useWeight — weight log entries with optional per-day focus.
 *
 * `date` defaults to today (May 7 bundle: hook accepts `date?: Date`).
 *
 * Returns:
 *  - `lastWeight`: most recent overall entry (history pointer)
 *  - `todayWeight`: entry for today (kept for back-compat)
 *  - `entryForDay`: entry for the `date` argument (new in May 7)
 *  - `recentWeights`: last 10 entries
 *  - `logWeight(weight)` / `saveWeight(weight)`: upsert weight on `date`
 *  - `deleteWeight()`: delete entry on `date` (new in May 7)
 */
export function useWeight(date: Date = new Date()) {
  const { user } = useAuth();
  const [lastWeight, setLastWeight] = useState<WeightLog | null>(null);
  const [entryForDay, setEntryForDay] = useState<WeightLog | null>(null);
  const [recentWeights, setRecentWeights] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(true);

  const dateKey = useMemo(() => toDateKey(date), [date]);

  const fetchLastWeight = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [lastRes, dayRes, recentRes] = await Promise.all([
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
          .eq('log_date', dateKey)
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
      setEntryForDay(
        dayRes.data ? (dayRes.data as WeightLog) : null,
      );
      setRecentWeights(
        recentRes.data ? (recentRes.data as WeightLog[]) : [],
      );
    } finally {
      setLoading(false);
    }
  }, [user, dateKey]);

  useEffect(() => {
    fetchLastWeight();
  }, [fetchLastWeight]);

  const logWeight = useCallback(
    async (weight: number) => {
      if (!user) return;

      if (entryForDay) {
        // Update existing entry for the selected day
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
        const { error } = await (supabase.from('weight_logs') as any)
          .update({ weight })
          .eq('id', entryForDay.id);
        if (error) throw error;
      } else {
        // Insert new entry on the selected day
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
        const { error } = await (supabase.from('weight_logs') as any).insert({
          user_id: user.id,
          log_date: dateKey,
          weight,
          notes: null,
        });
        if (error) throw error;
      }

      await fetchLastWeight();
    },
    [user, dateKey, entryForDay, fetchLastWeight],
  );

  const deleteWeight = useCallback(async () => {
    if (!user || !entryForDay) return;
    const { error } = await supabase
      .from('weight_logs')
      .delete()
      .eq('id', entryForDay.id)
      .eq('user_id', user.id);
    if (error) throw error;
    await fetchLastWeight();
  }, [user, entryForDay, fetchLastWeight]);

  return {
    lastWeight,
    /** alias for back-compat with baseline callers */
    todayWeight: entryForDay,
    entryForDay,
    recentWeights,
    loading,
    logWeight,
    /** alias used by the May 7 WeightEntry scaffold */
    saveWeight: logWeight,
    deleteWeight,
    refetch: fetchLastWeight,
  };
}
