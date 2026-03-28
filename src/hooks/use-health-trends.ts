import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { toDateKey } from '../utils/storage';
import type { Symptom, FoodLog, WeightLog } from '../types/database';

export type TimeRange = '7d' | '30d' | '90d';

export interface MoodEnergyPoint {
  date: string;
  mood: number | null;
  energy: number | null;
}

export interface DailyNutrition {
  date: string;
  calories: number;
  protein: number;
}

export interface SymptomFrequency {
  name: string;
  key: string;
  count: number;
  avgSeverity: number;
}

export interface WeightPoint {
  date: string;
  weight: number;
}

interface HealthTrendsReturn {
  moodEnergy: MoodEnergyPoint[];
  nutrition: DailyNutrition[];
  symptomFrequency: SymptomFrequency[];
  weight: WeightPoint[];
  loading: boolean;
  range: TimeRange;
  setRange: (r: TimeRange) => void;
}

const SYMPTOM_KEYS = ['bloating', 'acne', 'hair_loss', 'hirsutism', 'fatigue', 'brain_fog', 'cravings', 'anxiety'] as const;
const SYMPTOM_LABELS: Record<string, string> = {
  bloating: 'Bloating',
  acne: 'Acne',
  hair_loss: 'Hair Loss',
  hirsutism: 'Excess Hair',
  fatigue: 'Fatigue',
  brain_fog: 'Brain Fog',
  cravings: 'Cravings',
  anxiety: 'Anxiety',
};

function getDateRange(range: TimeRange): { start: string; end: string } {
  const now = new Date();
  const end = toDateKey(now);
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);
  return { start: toDateKey(startDate), end };
}

function aggregateNutritionByDay(logs: FoodLog[]): DailyNutrition[] {
  const map = new Map<string, DailyNutrition>();
  for (const log of logs) {
    const existing = map.get(log.log_date) ?? { date: log.log_date, calories: 0, protein: 0 };
    existing.calories += log.calories ?? 0;
    existing.protein += log.protein ?? 0;
    map.set(log.log_date, existing);
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function aggregateSymptomFrequency(rows: Symptom[]): SymptomFrequency[] {
  return SYMPTOM_KEYS
    .map((key) => {
      const values = rows
        .map((r) => r[key] as number)
        .filter((v) => v > 0);
      return {
        name: SYMPTOM_LABELS[key],
        key,
        count: values.length,
        avgSeverity: values.length > 0
          ? values.reduce((a, b) => a + b, 0) / values.length
          : 0,
      };
    })
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count);
}

export function useHealthTrends(): HealthTrendsReturn {
  const { user } = useAuth();
  const [range, setRange] = useState<TimeRange>('7d');
  const [loading, setLoading] = useState(true);
  const [moodEnergy, setMoodEnergy] = useState<MoodEnergyPoint[]>([]);
  const [nutrition, setNutrition] = useState<DailyNutrition[]>([]);
  const [symptomFrequency, setSymptomFrequency] = useState<SymptomFrequency[]>([]);
  const [weight, setWeight] = useState<WeightPoint[]>([]);

  const fetchTrends = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { start, end } = getDateRange(range);

    try {
      const [moodRes, foodRes, symptomRes, weightRes] = await Promise.all([
        supabase
          .from('symptoms')
          .select('*')
          .eq('user_id', user.id)
          .gte('log_date', start)
          .lte('log_date', end)
          .not('mood', 'is', null)
          .order('log_date', { ascending: true }),
        supabase
          .from('food_logs')
          .select('*')
          .eq('user_id', user.id)
          .gte('log_date', start)
          .lte('log_date', end)
          .order('log_date', { ascending: true }),
        supabase
          .from('symptoms')
          .select('*')
          .eq('user_id', user.id)
          .gte('log_date', start)
          .lte('log_date', end),
        supabase
          .from('weight_logs')
          .select('*')
          .eq('user_id', user.id)
          .gte('log_date', start)
          .lte('log_date', end)
          .order('log_date', { ascending: true }),
      ]);

      const moodData = (moodRes.data ?? []) as Symptom[];
      setMoodEnergy(
        moodData.map((r) => ({
          date: r.log_date,
          mood: r.mood,
          energy: r.energy_level,
        }))
      );

      setNutrition(aggregateNutritionByDay((foodRes.data ?? []) as FoodLog[]));
      setSymptomFrequency(aggregateSymptomFrequency((symptomRes.data ?? []) as Symptom[]));

      const weightData = (weightRes.data ?? []) as WeightLog[];
      setWeight(
        weightData.map((r) => ({
          date: r.log_date,
          weight: r.weight,
        }))
      );
    } catch (err) {
      console.warn('Failed to fetch health trends:', err);
    } finally {
      setLoading(false);
    }
  }, [user, range]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  return useMemo(
    () => ({ moodEnergy, nutrition, symptomFrequency, weight, loading, range, setRange }),
    [moodEnergy, nutrition, symptomFrequency, weight, loading, range]
  );
}
