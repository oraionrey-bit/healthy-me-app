import { useState, useEffect, useCallback, useMemo } from 'react';
import { startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { toDateKey } from '../utils/storage';
import type { PeriodLog, FlowLevel } from '../types/database';

export interface PeriodLogInput {
  flow: FlowLevel | null;
  cramps: number;
  headache: boolean;
  back_pain: boolean;
  notes: string | null;
}

interface UsePeriodCalendarReturn {
  periodLogs: Map<string, PeriodLog>;
  loading: boolean;
  saving: boolean;
  currentMonth: Date;
  selectedDate: string | null;
  setSelectedDate: (d: string | null) => void;
  setCurrentMonth: (d: Date) => void;
  goNextMonth: () => void;
  goPrevMonth: () => void;
  savePeriodLog: (dateKey: string, input: PeriodLogInput) => Promise<void>;
  deletePeriodLog: (dateKey: string) => Promise<void>;
}

export function usePeriodCalendar(): UsePeriodCalendarReturn {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [periodLogs, setPeriodLogs] = useState<Map<string, PeriodLog>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const fetchPeriodMonth = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const start = toDateKey(startOfMonth(currentMonth));
    const end = toDateKey(endOfMonth(currentMonth));

    try {
      const { data, error } = await supabase
        .from('period_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('log_date', start)
        .lte('log_date', end)
        .order('log_date', { ascending: true });

      if (error) throw error;

      const map = new Map<string, PeriodLog>();
      for (const log of (data ?? []) as PeriodLog[]) {
        map.set(log.log_date, log);
      }
      setPeriodLogs(map);
    } catch (err) {
      console.warn('Failed to fetch period logs:', err);
    } finally {
      setLoading(false);
    }
  }, [user, currentMonth]);

  useEffect(() => {
    fetchPeriodMonth();
  }, [fetchPeriodMonth]);

  const savePeriodLog = useCallback(
    async (dateKey: string, input: PeriodLogInput) => {
      if (!user) return;
      setSaving(true);
      try {
        const existing = periodLogs.get(dateKey);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = supabase as any;
        if (existing) {
          const { error } = await db
            .from('period_logs')
            .update({
              flow: input.flow,
              cramps: input.cramps,
              headache: input.headache,
              back_pain: input.back_pain,
              notes: input.notes,
            })
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await db.from('period_logs').insert({
            user_id: user.id,
            log_date: dateKey,
            flow: input.flow,
            cramps: input.cramps,
            headache: input.headache,
            back_pain: input.back_pain,
            notes: input.notes,
          });
          if (error) throw error;
        }
        await fetchPeriodMonth();
      } catch (err) {
        console.warn('Failed to save period log:', err);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [user, periodLogs, fetchPeriodMonth]
  );

  const deletePeriodLog = useCallback(
    async (dateKey: string) => {
      if (!user) return;
      const existing = periodLogs.get(dateKey);
      if (!existing) return;
      setSaving(true);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('period_logs')
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
        await fetchPeriodMonth();
      } catch (err) {
        console.warn('Failed to delete period log:', err);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [user, periodLogs, fetchPeriodMonth]
  );

  const goNextMonth = useCallback(() => setCurrentMonth((m) => addMonths(m, 1)), []);
  const goPrevMonth = useCallback(() => setCurrentMonth((m) => subMonths(m, 1)), []);

  return useMemo(
    () => ({
      periodLogs,
      loading,
      saving,
      currentMonth,
      selectedDate,
      setSelectedDate,
      setCurrentMonth,
      goNextMonth,
      goPrevMonth,
      savePeriodLog,
      deletePeriodLog,
    }),
    [periodLogs, loading, saving, currentMonth, selectedDate, goNextMonth, goPrevMonth, savePeriodLog, deletePeriodLog]
  );
}
