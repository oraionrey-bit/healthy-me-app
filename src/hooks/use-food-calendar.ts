import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { toDateKey } from '../utils/storage';
import type { FoodLog } from '../types/database';

export interface DaySummary {
  date: string;
  totalCalories: number;
  totalProtein: number;
  mealCount: number;
  mealTypes: Set<FoodLog['meal_type']>;
}

type SummaryMap = Map<string, DaySummary>;

async function fetchMonthData(userId: string, monthDate: Date) {
  const start = toDateKey(startOfMonth(monthDate));
  const end = toDateKey(endOfMonth(monthDate));

  const { data, error } = await supabase
    .from('food_logs')
    .select('log_date, calories, protein, meal_type')
    .eq('user_id', userId)
    .gte('log_date', start)
    .lte('log_date', end)
    .order('log_date', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Pick<FoodLog, 'log_date' | 'calories' | 'protein' | 'meal_type'>[];
}

function aggregateByDay(
  logs: Pick<FoodLog, 'log_date' | 'calories' | 'protein' | 'meal_type'>[],
): SummaryMap {
  const map: SummaryMap = new Map();
  for (const log of logs) {
    const existing = map.get(log.log_date) ?? {
      date: log.log_date,
      totalCalories: 0,
      totalProtein: 0,
      mealCount: 0,
      mealTypes: new Set<FoodLog['meal_type']>(),
    };
    existing.totalCalories += log.calories ?? 0;
    existing.totalProtein += log.protein ?? 0;
    existing.mealCount += 1;
    existing.mealTypes.add(log.meal_type);
    map.set(log.log_date, existing);
  }
  return map;
}

export function useFoodCalendar() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [summaries, setSummaries] = useState<SummaryMap>(new Map());
  const [loading, setLoading] = useState(true);
  const cache = useRef<Map<string, SummaryMap>>(new Map());

  const fetchMonth = useCallback(
    async (month: Date) => {
      if (!user) return;
      const key = toDateKey(month);

      // Use cache if available
      const cached = cache.current.get(key);
      if (cached) {
        setSummaries(cached);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const logs = await fetchMonthData(user.id, month);
        const result = aggregateByDay(logs);
        cache.current.set(key, result);
        setSummaries(result);
      } catch {
        setSummaries(new Map());
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  useEffect(() => {
    fetchMonth(currentMonth);
  }, [currentMonth, fetchMonth]);

  useFocusEffect(
    useCallback(() => {
      // Invalidate cache for current month on focus and re-fetch
      const key = toDateKey(currentMonth);
      cache.current.delete(key);
      fetchMonth(currentMonth);
    }, [currentMonth, fetchMonth]),
  );

  const goNextMonth = useCallback(() => setCurrentMonth((m) => addMonths(m, 1)), []);
  const goPrevMonth = useCallback(() => setCurrentMonth((m) => subMonths(m, 1)), []);
  const goToMonth = useCallback((date: Date) => setCurrentMonth(startOfMonth(date)), []);

  return {
    summaries,
    loading,
    currentMonth,
    setCurrentMonth: goToMonth,
    goNextMonth,
    goPrevMonth,
  };
}
