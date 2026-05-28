import { toDateKey } from '../utils/storage';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { DailyLog } from '../types/database';

interface SaveDailyLogInput {
  mood?: string;
  energy?: string;
  period?: string | null;
  exercise?: string;
  health_notes?: string;
}

/**
 * useDailyLog — daily-log row for a given day.
 *
 * `date` defaults to today (May 7 bundle: hook accepts `date?: Date`).
 */
export function useDailyLog(date: Date = new Date()) {
  const { user } = useAuth();
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);
  const [loading, setLoading] = useState(true);
  const dateKey = useMemo(() => toDateKey(date), [date]);

  const fetchDailyLog = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('log_date', dateKey)
        .maybeSingle();

      if (error) throw error;
      setDailyLog((data as DailyLog | null) ?? null);
    } finally {
      setLoading(false);
    }
  }, [user, dateKey]);

  useEffect(() => {
    fetchDailyLog();
  }, [fetchDailyLog]);

  const saveDailyLog = useCallback(
    async (input: SaveDailyLogInput) => {
      if (!user) return;

      const moodValue = JSON.stringify({
        mood: input.mood ?? null,
        energy: input.energy ?? null,
      });

      if (dailyLog) {
        const hasPeriodInput = Object.prototype.hasOwnProperty.call(input, 'period');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
        const { error } = await (supabase.from('daily_logs') as any)
          .update({
            mood: moodValue,
            period: hasPeriodInput ? input.period : dailyLog.period,
            exercise: input.exercise ?? dailyLog.exercise,
            health_notes: input.health_notes ?? dailyLog.health_notes,
          })
          .eq('id', dailyLog.id);
        if (error) throw error;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
        const { error } = await (supabase.from('daily_logs') as any).insert({
          user_id: user.id,
          log_date: dateKey,
          mood: moodValue,
          period: input.period ?? null,
          exercise: input.exercise ?? null,
          health_notes: input.health_notes ?? null,
        });
        if (error) throw error;
      }

      await fetchDailyLog();
    },
    [user, dailyLog, dateKey, fetchDailyLog],
  );

  return {
    dailyLog,
    loading,
    saveDailyLog,
    refetch: fetchDailyLog,
  };
}
