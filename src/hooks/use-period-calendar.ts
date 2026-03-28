import { useState, useEffect, useCallback, useMemo } from 'react';
import { startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { toDateKey } from '../utils/storage';
import type { PeriodLog } from '../types/database';

interface UsePeriodCalendarReturn {
  periodLogs: Map<string, PeriodLog>;
  loading: boolean;
  currentMonth: Date;
  setCurrentMonth: (d: Date) => void;
  goNextMonth: () => void;
  goPrevMonth: () => void;
}

export function usePeriodCalendar(): UsePeriodCalendarReturn {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [periodLogs, setPeriodLogs] = useState<Map<string, PeriodLog>>(new Map());
  const [loading, setLoading] = useState(true);

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

  const goNextMonth = useCallback(() => setCurrentMonth((m) => addMonths(m, 1)), []);
  const goPrevMonth = useCallback(() => setCurrentMonth((m) => subMonths(m, 1)), []);

  return useMemo(
    () => ({ periodLogs, loading, currentMonth, setCurrentMonth, goNextMonth, goPrevMonth }),
    [periodLogs, loading, currentMonth, goNextMonth, goPrevMonth]
  );
}
