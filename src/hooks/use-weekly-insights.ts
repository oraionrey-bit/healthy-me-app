import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useUserProfile } from './use-user-profile';
import { toDateKey } from '../utils/storage';

export interface WeeklyInsight {
  emoji: string;
  text: string;
  category: 'nutrition' | 'sleep' | 'supplements' | 'activity' | 'general';
}

export interface WeeklyInsightsData {
  avgCalories: number;
  avgProtein: number;
  proteinGoalDays: number;
  supplementAdherencePct: number;
  avgSleepScore: number | null;
  avgActivityScore: number | null;
  totalExerciseMinutes: number;
  weightChange: number | null;
  insights: WeeklyInsight[];
  daysTracked: number;
  // Trend directions
  calorieTrend: 'up' | 'down' | 'stable';
  proteinTrend: 'up' | 'down' | 'stable';
  sleepTrend: 'up' | 'down' | 'stable';
  activityTrend: 'up' | 'down' | 'stable';
}

function getWeekRange(): { startKey: string; endKey: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  return { startKey: toDateKey(start), endKey: toDateKey(end) };
}

function getPrevWeekRange(): { startKey: string; endKey: string } {
  const end = new Date();
  end.setDate(end.getDate() - 7);
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  return { startKey: toDateKey(start), endKey: toDateKey(end) };
}

function trendArrow(trend: 'up' | 'down' | 'stable'): string {
  if (trend === 'up') return '↑';
  if (trend === 'down') return '↓';
  return '→';
}

function determineTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
  const diff = current - previous;
  const threshold = previous * 0.05; // 5% threshold
  if (diff > threshold) return 'up';
  if (diff < -threshold) return 'down';
  return 'stable';
}

function generateInsights(data: {
  avgCalories: number;
  avgProtein: number;
  proteinGoalDays: number;
  supplementAdherencePct: number;
  avgSleepScore: number | null;
  avgActivityScore: number | null;
  totalExerciseMinutes: number;
  weightChange: number | null;
  daysTracked: number;
  activityTrend: 'up' | 'down' | 'stable';
}): WeeklyInsight[] {
  const insights: WeeklyInsight[] = [];

  // Protein insight
  if (data.proteinGoalDays >= 5) {
    insights.push({
      emoji: '💪',
      text: `You hit your protein goal ${data.proteinGoalDays}/7 days — great for your health!`,
      category: 'nutrition',
    });
  } else if (data.proteinGoalDays >= 3) {
    insights.push({
      emoji: '🥩',
      text: `Protein goal hit ${data.proteinGoalDays}/7 days — you're building the habit! Keep it up!`,
      category: 'nutrition',
    });
  } else if (data.daysTracked > 0) {
    insights.push({
      emoji: '✨',
      text: `Logging meals is the first step! Try adding a protein source to each meal this week.`,
      category: 'nutrition',
    });
  }

  // Sleep insight
  if (data.avgSleepScore !== null) {
    if (data.avgSleepScore >= 85) {
      insights.push({
        emoji: '😴',
        text: `Sleep averaged ${Math.round(data.avgSleepScore)} — excellent for hormonal recovery!`,
        category: 'sleep',
      });
    } else if (data.avgSleepScore >= 70) {
      insights.push({
        emoji: '🌙',
        text: `Sleep score at ${Math.round(data.avgSleepScore)} — solid foundation for your health!`,
        category: 'sleep',
      });
    }
  }

  // Supplement insight
  if (data.supplementAdherencePct >= 80) {
    insights.push({
      emoji: '💊',
      text: `Supplement adherence at ${data.supplementAdherencePct}% — amazing consistency!`,
      category: 'supplements',
    });
  } else if (data.supplementAdherencePct >= 50) {
    insights.push({
      emoji: '💊',
      text: `Supplement adherence was ${data.supplementAdherencePct}% — consistency is key!`,
      category: 'supplements',
    });
  } else if (data.supplementAdherencePct > 0) {
    insights.push({
      emoji: '🌟',
      text: `Every supplement you take counts! Even small consistency improvements make a difference.`,
      category: 'supplements',
    });
  }

  // Activity insight
  if (data.activityTrend === 'up') {
    insights.push({
      emoji: '🏃‍♀️',
      text: `Activity score trending up ${trendArrow('up')} — your body benefits from the movement!`,
      category: 'activity',
    });
  } else if (data.totalExerciseMinutes >= 150) {
    insights.push({
      emoji: '🎉',
      text: `${data.totalExerciseMinutes} min of exercise this week — you're crushing it!`,
      category: 'activity',
    });
  } else if (data.totalExerciseMinutes > 0) {
    insights.push({
      emoji: '🚶‍♀️',
      text: `${data.totalExerciseMinutes} min of movement this week — every step counts for hormone balance!`,
      category: 'activity',
    });
  }

  // Weight insight (only if positive)
  if (data.weightChange !== null && data.weightChange < 0) {
    insights.push({
      emoji: '⚖️',
      text: `Weight trending in a healthy direction — your consistency is paying off!`,
      category: 'general',
    });
  }

  return insights.slice(0, 4); // Max 4 insights
}

export function useWeeklyInsights() {
  const { user } = useAuth();
  const { proteinTarget } = useUserProfile();
  const [data, setData] = useState<WeeklyInsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInsights = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { startKey, endKey } = getWeekRange();
      const prev = getPrevWeekRange();

      const [foodRes, suppRes, suppLogRes, ouraRes, exerciseRes, weightRes, prevFoodRes, prevOuraRes] =
        await Promise.all([
          // Current week food
          supabase
            .from('food_logs')
            .select('calories, protein, log_date')
            .eq('user_id', user.id)
            .gte('log_date', startKey)
            .lte('log_date', endKey),
          // Active supplements
          supabase
            .from('user_supplements')
            .select('id')
            .eq('user_id', user.id)
            .eq('is_active', true),
          // Supplement logs this week
          supabase
            .from('supplement_logs')
            .select('taken, log_date')
            .eq('user_id', user.id)
            .gte('log_date', startKey)
            .lte('log_date', endKey),
          // Oura daily this week
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic query
          (supabase.from('oura_daily') as any)
            .select('sleep_score, activity_score, log_date')
            .eq('user_id', user.id)
            .gte('log_date', startKey)
            .lte('log_date', endKey),
          // Exercise this week
          supabase
            .from('exercise_logs')
            .select('duration_minutes')
            .eq('user_id', user.id)
            .gte('log_date', startKey)
            .lte('log_date', endKey),
          // Weight logs this week
          supabase
            .from('weight_logs')
            .select('weight, log_date')
            .eq('user_id', user.id)
            .gte('log_date', startKey)
            .lte('log_date', endKey)
            .order('log_date', { ascending: true }),
          // Previous week food (for trends)
          supabase
            .from('food_logs')
            .select('calories, protein, log_date')
            .eq('user_id', user.id)
            .gte('log_date', prev.startKey)
            .lte('log_date', prev.endKey),
          // Previous week oura (for trends)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic query
          (supabase.from('oura_daily') as any)
            .select('sleep_score, activity_score')
            .eq('user_id', user.id)
            .gte('log_date', prev.startKey)
            .lte('log_date', prev.endKey),
        ]);

      // Process food data
      const foodRows = (foodRes.data ?? []) as Array<{ calories: number | null; protein: number | null; log_date: string }>;
      const foodByDay = new Map<string, { cal: number; prot: number }>();
      for (const row of foodRows) {
        const existing = foodByDay.get(row.log_date) ?? { cal: 0, prot: 0 };
        existing.cal += row.calories ?? 0;
        existing.prot += row.protein ?? 0;
        foodByDay.set(row.log_date, existing);
      }
      const foodDays = foodByDay.size;
      const totalCal = Array.from(foodByDay.values()).reduce((s, v) => s + v.cal, 0);
      const totalProt = Array.from(foodByDay.values()).reduce((s, v) => s + v.prot, 0);
      const avgCalories = foodDays > 0 ? Math.round(totalCal / foodDays) : 0;
      const avgProtein = foodDays > 0 ? Math.round(totalProt / foodDays) : 0;

      // Protein goal days — uses profile target instead of hardcoded value
      const proteinGoalDays = Array.from(foodByDay.values()).filter((v) => v.prot >= proteinTarget).length;

      // Supplements adherence
      const totalSupps = suppRes.data?.length ?? 0;
      const suppLogs = (suppLogRes.data ?? []) as Array<{ taken: boolean; log_date: string }>;
      const suppDays = new Set(suppLogs.map((l) => l.log_date)).size;
      const totalPossible = totalSupps * Math.max(suppDays, 1);
      const takenTotal = suppLogs.filter((l) => l.taken).length;
      const supplementAdherencePct = totalPossible > 0 ? Math.round((takenTotal / totalPossible) * 100) : 0;

      // Oura data
      const ouraRows = (ouraRes.data ?? []) as Array<{ sleep_score: number | null; activity_score: number | null; log_date: string }>;
      const sleepScores = ouraRows.map((r) => r.sleep_score).filter((s): s is number => s !== null);
      const activityScores = ouraRows.map((r) => r.activity_score).filter((s): s is number => s !== null);
      const avgSleepScore = sleepScores.length > 0 ? sleepScores.reduce((a, b) => a + b, 0) / sleepScores.length : null;
      const avgActivityScore = activityScores.length > 0 ? activityScores.reduce((a, b) => a + b, 0) / activityScores.length : null;

      // Exercise
      const exercises = (exerciseRes.data ?? []) as Array<{ duration_minutes: number | null }>;
      const totalExerciseMinutes = exercises.reduce((s, e) => s + (e.duration_minutes ?? 0), 0);

      // Weight change
      const weightRows = (weightRes.data ?? []) as Array<{ weight: number; log_date: string }>;
      const weightChange = weightRows.length >= 2 ? weightRows[weightRows.length - 1].weight - weightRows[0].weight : null;

      // Trends from previous week
      const prevFoodRows = (prevFoodRes.data ?? []) as Array<{ calories: number | null; protein: number | null; log_date: string }>;
      const prevFoodByDay = new Map<string, { cal: number; prot: number }>();
      for (const row of prevFoodRows) {
        const existing = prevFoodByDay.get(row.log_date) ?? { cal: 0, prot: 0 };
        existing.cal += row.calories ?? 0;
        existing.prot += row.protein ?? 0;
        prevFoodByDay.set(row.log_date, existing);
      }
      const prevFoodDays = prevFoodByDay.size;
      const prevTotalCal = Array.from(prevFoodByDay.values()).reduce((s, v) => s + v.cal, 0);
      const prevTotalProt = Array.from(prevFoodByDay.values()).reduce((s, v) => s + v.prot, 0);
      const prevAvgCalories = prevFoodDays > 0 ? prevTotalCal / prevFoodDays : 0;
      const prevAvgProtein = prevFoodDays > 0 ? prevTotalProt / prevFoodDays : 0;

      const prevOuraRows = (prevOuraRes.data ?? []) as Array<{ sleep_score: number | null; activity_score: number | null }>;
      const prevSleepScores = prevOuraRows.map((r) => r.sleep_score).filter((s): s is number => s !== null);
      const prevActivityScores = prevOuraRows.map((r) => r.activity_score).filter((s): s is number => s !== null);
      const prevAvgSleep = prevSleepScores.length > 0 ? prevSleepScores.reduce((a, b) => a + b, 0) / prevSleepScores.length : 0;
      const prevAvgActivity = prevActivityScores.length > 0 ? prevActivityScores.reduce((a, b) => a + b, 0) / prevActivityScores.length : 0;

      const calorieTrend = prevAvgCalories > 0 ? determineTrend(avgCalories, prevAvgCalories) : 'stable';
      const proteinTrend = prevAvgProtein > 0 ? determineTrend(avgProtein, prevAvgProtein) : 'stable';
      const sleepTrend = avgSleepScore !== null && prevAvgSleep > 0 ? determineTrend(avgSleepScore, prevAvgSleep) : 'stable';
      const activityTrend = avgActivityScore !== null && prevAvgActivity > 0 ? determineTrend(avgActivityScore, prevAvgActivity) : 'stable';

      const insights = generateInsights({
        avgCalories,
        avgProtein,
        proteinGoalDays,
        supplementAdherencePct,
        avgSleepScore,
        avgActivityScore,
        totalExerciseMinutes,
        weightChange,
        daysTracked: foodDays,
        activityTrend,
      });

      setData({
        avgCalories,
        avgProtein,
        proteinGoalDays,
        supplementAdherencePct,
        avgSleepScore,
        avgActivityScore,
        totalExerciseMinutes,
        weightChange,
        insights,
        daysTracked: foodDays,
        calorieTrend,
        proteinTrend,
        sleepTrend,
        activityTrend,
      });
    } catch (err) {
      console.error('Failed to fetch weekly insights:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  useFocusEffect(
    useCallback(() => {
      fetchInsights();
    }, [fetchInsights]),
  );

  return { data, loading, refresh: fetchInsights };
}
