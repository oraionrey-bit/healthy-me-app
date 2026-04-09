import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { toDateKey } from '../utils/storage';
import { useDebouncedFocusEffect } from './use-debounced-focus';

/**
 * Comprehensive daily score (0–100) combining all tracked metrics.
 *
 * Category weights (when all sources available):
 *   Protein  20%  — % of 80 g target met (cap 100%)
 *   Calories 15%  — best at target, penalty for over/under
 *   Supps    20%  — % of supplements taken
 *   Water    10%  — % of water goal met (cap 100%)
 *   Exercise 15%  — any exercise logged = 100%, Oura activity ≥80 = 80%
 *   Sleep    10%  — Oura sleep_score/100 (skipped + redistributed if unavailable)
 *   Check-in 10%  — mood + energy logged = 100%
 *
 * If a category has no data source, its weight is redistributed.
 */

// ── Types ──

interface CategoryScore {
  /** Raw 0–100 score for this category */
  raw: number;
  /** Weight (0–1) after redistribution */
  weight: number;
  /** Weighted contribution to total (0–100) */
  contribution: number;
  /** Human label */
  label: string;
  /** Emoji */
  emoji: string;
}

export interface ScoreBreakdown {
  protein: CategoryScore;
  calories: CategoryScore;
  supplements: CategoryScore;
  water: CategoryScore;
  exercise: CategoryScore;
  sleep: CategoryScore;
  checkin: CategoryScore;
  total: number;
}

export interface UseDailyScoreReturn {
  score: number;
  breakdown: ScoreBreakdown | null;
  tips: string[];
  loading: boolean;
  refresh: () => Promise<void>;
}

// ── Helpers ──

const BASE_WEIGHTS: Record<string, number> = {
  protein: 0.20,
  calories: 0.15,
  supplements: 0.20,
  water: 0.10,
  exercise: 0.15,
  sleep: 0.10,
  checkin: 0.10,
};

const CATEGORY_META: Record<string, { label: string; emoji: string }> = {
  protein: { label: 'Protein', emoji: '🥩' },
  calories: { label: 'Calories', emoji: '🔥' },
  supplements: { label: 'Supplements', emoji: '💊' },
  water: { label: 'Water', emoji: '💧' },
  exercise: { label: 'Exercise', emoji: '🏋️' },
  sleep: { label: 'Sleep', emoji: '😴' },
  checkin: { label: 'Check-in', emoji: '📝' },
};

function scoreCalories(consumed: number, target: number): number {
  if (target <= 0) return 0;
  const lower = target - 100;
  const upper = target + 100;
  if (consumed >= lower && consumed <= upper) return 100;
  const diff = consumed < lower ? lower - consumed : consumed - upper;
  if (diff <= 200) return 80;
  if (diff <= 400) return 50;
  return 20;
}

function generateTips(breakdown: ScoreBreakdown): string[] {
  const tips: string[] = [];
  const sorted = (Object.keys(CATEGORY_META) as Array<keyof typeof CATEGORY_META>)
    .map((key) => ({
      key,
      cat: breakdown[key as keyof ScoreBreakdown] as CategoryScore,
    }))
    .filter((c) => c.cat && c.cat.weight > 0)
    .sort((a, b) => a.cat.raw - b.cat.raw);

  // Lowest scoring category tip
  const lowest = sorted[0];
  if (lowest && lowest.cat.raw < 100) {
    const potential = Math.round((100 - lowest.cat.raw) * lowest.cat.weight);
    const meta = CATEGORY_META[lowest.key];
    switch (lowest.key) {
      case 'water':
        tips.push(`${meta.emoji} Log your water to boost your score by up to ${potential} points!`);
        break;
      case 'supplements':
        tips.push(`${meta.emoji} Take your supplements to gain up to ${potential} points!`);
        break;
      case 'protein':
        tips.push(`${meta.emoji} Eat more protein to earn up to ${potential} more points!`);
        break;
      case 'exercise':
        tips.push(`${meta.emoji} Log a workout to add up to ${potential} points!`);
        break;
      case 'checkin':
        tips.push(`${meta.emoji} Do your daily check-in for ${potential} easy points!`);
        break;
      case 'calories':
        tips.push(`${meta.emoji} Stay close to your calorie target to gain up to ${potential} points!`);
        break;
      case 'sleep':
        tips.push(`${meta.emoji} A good night's sleep could add ${potential} points!`);
        break;
    }
  }

  // Motivational tip
  if (breakdown.total >= 90) {
    tips.push('🌟 Amazing day! You\'re crushing it!');
  } else if (breakdown.total >= 70) {
    tips.push(`✨ Great progress! You're only ${100 - breakdown.total} points from a perfect day!`);
  } else if (breakdown.total >= 50) {
    const second = sorted[1];
    if (second && second.cat.raw < 100) {
      const meta = CATEGORY_META[second.key];
      const pot = Math.round((100 - second.cat.raw) * second.cat.weight);
      tips.push(`${meta.emoji} Also try improving your ${meta.label.toLowerCase()} for ${pot} more points!`);
    }
  }

  return tips.slice(0, 2);
}

// ── Hook ──

export function useDailyScore(date?: string): UseDailyScoreReturn {
  const { user } = useAuth();
  const [score, setScore] = useState(0);
  const [breakdown, setBreakdown] = useState<ScoreBreakdown | null>(null);
  const [tips, setTips] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const targetDate = date ?? toDateKey(new Date());

  const calculateScore = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [
        profileRes,
        supplementsRes,
        supplementLogsRes,
        foodLogsRes,
        exerciseLogsRes,
        waterLogsRes,
        symptomsRes,
        ouraRes,
      ] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('calorie_target, protein_target, water_target, oura_connected')
          .eq('id', user.id)
          .single(),
        supabase
          .from('user_supplements')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true),
        supabase
          .from('supplement_logs')
          .select('taken')
          .eq('user_id', user.id)
          .eq('log_date', targetDate),
        supabase
          .from('food_logs')
          .select('calories, protein')
          .eq('user_id', user.id)
          .eq('log_date', targetDate),
        supabase
          .from('exercise_logs')
          .select('id')
          .eq('user_id', user.id)
          .eq('log_date', targetDate),
        supabase
          .from('water_logs')
          .select('glasses')
          .eq('user_id', user.id)
          .eq('log_date', targetDate)
          .maybeSingle(),
        supabase
          .from('symptoms')
          .select('mood, energy_level')
          .eq('user_id', user.id)
          .eq('log_date', targetDate)
          .maybeSingle(),
        supabase
          .from('oura_daily')
          .select('sleep_score, activity_score')
          .eq('user_id', user.id)
          .eq('log_date', targetDate)
          .maybeSingle(),
      ]);

      const profile = profileRes.data as {
        calorie_target: number;
        protein_target: number;
        water_target: number;
        oura_connected: boolean;
      } | null;
      const calorieTarget = profile?.calorie_target ?? 1800;
      const proteinTarget = profile?.protein_target ?? 50;
      const waterGoal = profile?.water_target ?? 8;
      const ouraConnected = profile?.oura_connected ?? false;

      // 1. Protein score
      const totalProtein = (foodLogsRes.data ?? []).reduce(
        (s, e) => s + ((e as { protein: number | null }).protein ?? 0), 0,
      );
      const proteinRaw = Math.min(Math.round((totalProtein / proteinTarget) * 100), 100);

      // 2. Calorie score
      const totalCalories = (foodLogsRes.data ?? []).reduce(
        (s, e) => s + ((e as { calories: number | null }).calories ?? 0), 0,
      );
      const caloriesRaw = scoreCalories(totalCalories, calorieTarget);

      // 3. Supplements score
      const totalSupps = supplementsRes.data?.length ?? 0;
      const takenSupps = (supplementLogsRes.data ?? []).filter(
        (l) => (l as { taken: boolean }).taken,
      ).length;
      const supplementsRaw = totalSupps > 0
        ? Math.min(Math.round((takenSupps / totalSupps) * 100), 100)
        : 100; // no supplements configured = full marks

      // 4. Water score
      const glassesLogged = (waterLogsRes.data as { glasses: number } | null)?.glasses ?? 0;
      const waterRaw = waterGoal > 0
        ? Math.min(Math.round((glassesLogged / waterGoal) * 100), 100)
        : 100;

      // 5. Exercise score
      const hasExercise = (exerciseLogsRes.data?.length ?? 0) > 0;
      const ouraData = ouraRes.data as { sleep_score: number | null; activity_score: number | null } | null;
      const ouraActivity = ouraData?.activity_score ?? null;
      let exerciseRaw = 0;
      if (hasExercise) exerciseRaw = 100;
      else if (ouraActivity !== null && ouraActivity >= 80) exerciseRaw = 80;

      // 6. Sleep score (only if Oura connected and has data)
      const ouraSleep = ouraData?.sleep_score ?? null;
      const hasSleep = ouraConnected && ouraSleep !== null;
      const sleepRaw = hasSleep ? Math.min(ouraSleep!, 100) : 0;

      // 7. Check-in score
      const symptomData = symptomsRes.data as { mood: number | null; energy_level: number | null } | null;
      const checkinRaw = (symptomData?.mood != null && symptomData?.energy_level != null) ? 100 : 0;

      // Compute weights with redistribution
      const rawScores: Record<string, number> = {
        protein: proteinRaw,
        calories: caloriesRaw,
        supplements: supplementsRaw,
        water: waterRaw,
        exercise: exerciseRaw,
        sleep: sleepRaw,
        checkin: checkinRaw,
      };

      // Determine which categories are active (sleep is skipped if no Oura)
      const activeCategories = Object.keys(BASE_WEIGHTS).filter((key) => {
        if (key === 'sleep' && !hasSleep) return false;
        return true;
      });

      const totalBaseWeight = activeCategories.reduce((s, k) => s + BASE_WEIGHTS[k], 0);
      const weights: Record<string, number> = {};
      for (const key of Object.keys(BASE_WEIGHTS)) {
        if (activeCategories.includes(key)) {
          weights[key] = BASE_WEIGHTS[key] / totalBaseWeight; // normalize to sum to 1
        } else {
          weights[key] = 0;
        }
      }

      // Build breakdown
      const mkCat = (key: string): CategoryScore => ({
        raw: rawScores[key],
        weight: weights[key],
        contribution: Math.round(rawScores[key] * weights[key]),
        label: CATEGORY_META[key].label,
        emoji: CATEGORY_META[key].emoji,
      });

      const bd: ScoreBreakdown = {
        protein: mkCat('protein'),
        calories: mkCat('calories'),
        supplements: mkCat('supplements'),
        water: mkCat('water'),
        exercise: mkCat('exercise'),
        sleep: mkCat('sleep'),
        checkin: mkCat('checkin'),
        total: 0,
      };
      bd.total = bd.protein.contribution + bd.calories.contribution +
        bd.supplements.contribution + bd.water.contribution +
        bd.exercise.contribution + bd.sleep.contribution + bd.checkin.contribution;

      setScore(bd.total);
      setBreakdown(bd);
      setTips(generateTips(bd));

      // Persist to daily_scores table
      await persistScore(user.id, targetDate, bd, totalCalories, totalProtein,
        (foodLogsRes.data ?? []).reduce((s, e) => s + ((e as { carbs?: number | null }).carbs ?? 0), 0),
        (foodLogsRes.data ?? []).reduce((s, e) => s + ((e as { fat?: number | null }).fat ?? 0), 0),
      );
    } catch (err: unknown) {
      console.error('Failed to calculate daily score:', err);
    } finally {
      setLoading(false);
    }
  }, [user, targetDate]);

  useEffect(() => {
    calculateScore();
  }, [calculateScore]);

  useDebouncedFocusEffect(
    () => { calculateScore(); },
    [calculateScore],
  );

  return { score, breakdown, tips, loading, refresh: calculateScore };
}

async function persistScore(
  userId: string,
  scoreDate: string,
  bd: ScoreBreakdown,
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('daily_scores')
      .select('id')
      .eq('user_id', userId)
      .eq('score_date', scoreDate)
      .maybeSingle();

    const payload = {
      user_id: userId,
      score_date: scoreDate,
      supplement_score: bd.supplements.contribution,
      food_score: bd.protein.contribution + bd.calories.contribution,
      exercise_score: bd.exercise.contribution,
      water_score: bd.water.contribution,
      sleep_score: bd.sleep.contribution + bd.checkin.contribution,
      total_score: bd.total,
      calories_consumed: calories,
      protein_consumed: protein,
      carbs_consumed: carbs,
      fat_consumed: fat,
    };

    if (existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('daily_scores') as any)
        .update(payload)
        .eq('id', (existing as { id: string }).id);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('daily_scores') as any).insert(payload);
    }
  } catch (err) {
    console.error('Failed to persist daily score:', err);
  }
}
