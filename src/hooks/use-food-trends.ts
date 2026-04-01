import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { toDateKey } from '../utils/storage';
import { useUserProfile } from './use-user-profile';

// ── Types ──

export interface DayNutrition {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodTrendsSummary {
  avgCalories: number;
  avgProtein: number;
  highCalories: number;
  lowCalories: number;
  highProtein: number;
  lowProtein: number;
  daysOnProteinTarget: number;
  daysOnCalorieTarget: number;
  bestDay: string | null;
  worstDay: string | null;
  totalDays: number;
}

export type TrendRange = 'week' | 'month';

export interface UseFoodTrendsReturn {
  daily: DayNutrition[];
  summary: FoodTrendsSummary;
  range: TrendRange;
  setRange: (r: TrendRange) => void;
  loading: boolean;
  refresh: () => Promise<void>;
}

// ── Helpers ──

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateKey(d);
}

// ── Hook ──

export function useFoodTrends(): UseFoodTrendsReturn {
  const { user } = useAuth();
  const { calorieTarget, proteinTarget } = useUserProfile();
  const [daily, setDaily] = useState<DayNutrition[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<TrendRange>('week');

  const days = range === 'week' ? 7 : 30;
  const startDate = daysAgo(days - 1);
  const endDate = toDateKey(new Date());

  const fetchTrends = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('food_logs')
        .select('log_date, calories, protein, carbs, fat')
        .eq('user_id', user.id)
        .gte('log_date', startDate)
        .lte('log_date', endDate)
        .order('log_date', { ascending: true });

      if (error) {
        console.error('Food trends fetch error:', error);
        return;
      }

      // Aggregate by day
      const byDay = new Map<string, DayNutrition>();

      // Initialize all days in range
      for (let i = 0; i < days; i++) {
        const dk = daysAgo(days - 1 - i);
        byDay.set(dk, { date: dk, calories: 0, protein: 0, carbs: 0, fat: 0 });
      }

      for (const row of (data ?? [])) {
        const r = row as { log_date: string; calories: number | null; protein: number | null; carbs: number | null; fat: number | null };
        const existing = byDay.get(r.log_date);
        if (existing) {
          existing.calories += r.calories ?? 0;
          existing.protein += r.protein ?? 0;
          existing.carbs += r.carbs ?? 0;
          existing.fat += r.fat ?? 0;
        }
      }

      const sorted = Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date));
      setDaily(sorted);
    } catch (err) {
      console.error('Food trends error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, startDate, endDate, days]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  useFocusEffect(
    useCallback(() => {
      fetchTrends();
    }, [fetchTrends]),
  );

  const summary: FoodTrendsSummary = useMemo(() => {
    const tracked = daily.filter((d) => d.calories > 0 || d.protein > 0);
    if (tracked.length === 0) {
      return {
        avgCalories: 0,
        avgProtein: 0,
        highCalories: 0,
        lowCalories: 0,
        highProtein: 0,
        lowProtein: 0,
        daysOnProteinTarget: 0,
        daysOnCalorieTarget: 0,
        bestDay: null,
        worstDay: null,
        totalDays: 0,
      };
    }

    const cals = tracked.map((d) => d.calories);
    const prots = tracked.map((d) => d.protein);
    const avgCal = Math.round(cals.reduce((a, b) => a + b, 0) / tracked.length);
    const avgProt = Math.round(prots.reduce((a, b) => a + b, 0) / tracked.length);

    const daysOnProtein = tracked.filter((d) => d.protein >= proteinTarget).length;
    const daysOnCalorie = tracked.filter((d) => {
      const lower = calorieTarget - 200;
      const upper = calorieTarget + 200;
      return d.calories >= lower && d.calories <= upper;
    }).length;

    // Best/worst by simple scoring: closer to targets = better
    const scored = tracked.map((d) => {
      const protPct = Math.min(d.protein / proteinTarget, 1);
      const calDiff = Math.abs(d.calories - calorieTarget);
      const calScore = calDiff <= 100 ? 1 : calDiff <= 200 ? 0.8 : calDiff <= 400 ? 0.5 : 0.2;
      return { date: d.date, score: protPct * 0.6 + calScore * 0.4 };
    });
    scored.sort((a, b) => b.score - a.score);

    return {
      avgCalories: avgCal,
      avgProtein: avgProt,
      highCalories: Math.max(...cals),
      lowCalories: Math.min(...cals),
      highProtein: Math.max(...prots),
      lowProtein: Math.min(...prots),
      daysOnProteinTarget: daysOnProtein,
      daysOnCalorieTarget: daysOnCalorie,
      bestDay: scored[0]?.date ?? null,
      worstDay: scored[scored.length - 1]?.date ?? null,
      totalDays: tracked.length,
    };
  }, [daily, calorieTarget, proteinTarget]);

  return { daily, summary, range, setRange, loading, refresh: fetchTrends };
}
