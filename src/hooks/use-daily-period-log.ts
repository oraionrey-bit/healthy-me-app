import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { FlowLevel, PeriodLog } from '../types/database';

/** Loads and saves the period entry that belongs to one Home check-in date. */
export function useDailyPeriodLog(dateKey: string) {
  const { user } = useAuth();
  const [periodLog, setPeriodLog] = useState<PeriodLog | null>(null);

  const fetchPeriodLog = useCallback(async () => {
    if (!user) {
      setPeriodLog(null);
      return;
    }

    const { data, error } = await supabase
      .from('period_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', dateKey)
      .maybeSingle();

    if (error) throw error;
    setPeriodLog((data as PeriodLog | null) ?? null);
  }, [user, dateKey]);

  useEffect(() => {
    void fetchPeriodLog().catch((error) => {
      console.warn('Failed to load daily period status:', error);
    });
  }, [fetchPeriodLog]);

  const savePeriodFlow = useCallback(async (flow: FlowLevel | null) => {
    if (!user) return;

    if (flow === null) {
      const { error } = await supabase
        .from('period_logs')
        .delete()
        .eq('user_id', user.id)
        .eq('log_date', dateKey);
      if (error) throw error;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
      const { error } = await (supabase.from('period_logs') as any).upsert({
        user_id: user.id,
        log_date: dateKey,
        flow,
        cramps: 0,
        headache: false,
        back_pain: false,
        notes: null,
      }, { onConflict: 'user_id,log_date' });
      if (error) throw error;
    }

    await fetchPeriodLog();
  }, [user, dateKey, fetchPeriodLog]);

  return { periodLog, savePeriodFlow };
}
