import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { toDateKey } from '../utils/storage';
import type { DailyScore } from '../types/database';

/**
 * Scoring breakdown (0-100):
 * - Supplements taken (% of checklist) → 25 pts max
 * - Meals logged → 20 pts max (5 pts per meal, up to 4)
 * - Exercise logged → 20 pts max (any exercise = 20)
 * - Skincare routine done (% of AM+PM checklist) → 15 pts max
 * - Check-in completed (mood + energy) → 10 pts max
 * - Weight logged → 10 pts max
 */

const MAX_SUPPLEMENT = 25;
const MAX_FOOD = 20;
const MAX_EXERCISE = 20;
const MAX_SKINCARE = 15;
const MAX_CHECKIN = 10;
const MAX_WEIGHT = 10;

interface ScoreBreakdown {
  supplements: number;
  food: number;
  exercise: number;
  skincare: number;
  checkin: number;
  weight: number;
  total: number;
}

interface UseDailyScoreReturn {
  score: ScoreBreakdown | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useDailyScore(date?: string): UseDailyScoreReturn {
  const { user } = useAuth();
  const [score, setScore] = useState<ScoreBreakdown | null>(null);
  const [loading, setLoading] = useState(true);

  const targetDate = date ?? toDateKey(new Date());

  const calculateScore = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [
        supplementsRes,
        supplementLogsRes,
        foodLogsRes,
        exerciseLogsRes,
        weightLogsRes,
        symptomsRes,
        dailyLogsRes,
      ] = await Promise.all([
        // Total active supplements
        supabase
          .from('user_supplements')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true),
        // Today's supplement logs
        supabase
          .from('supplement_logs')
          .select('taken')
          .eq('user_id', user.id)
          .eq('log_date', targetDate),
        // Today's food logs
        supabase
          .from('food_logs')
          .select('id')
          .eq('user_id', user.id)
          .eq('log_date', targetDate),
        // Today's exercise logs
        supabase
          .from('exercise_logs')
          .select('id')
          .eq('user_id', user.id)
          .eq('log_date', targetDate),
        // Today's weight log
        supabase
          .from('weight_logs')
          .select('id')
          .eq('user_id', user.id)
          .eq('log_date', targetDate),
        // Today's mood/energy (symptoms table)
        supabase
          .from('symptoms')
          .select('mood, energy_level')
          .eq('user_id', user.id)
          .eq('log_date', targetDate)
          .maybeSingle(),
        // Today's daily log (skincare data stored in health_notes)
        supabase
          .from('daily_logs')
          .select('health_notes')
          .eq('user_id', user.id)
          .eq('log_date', targetDate)
          .maybeSingle(),
      ]);

      // 1. Supplements score (% taken)
      const totalSupplements = supplementsRes.data?.length ?? 0;
      const takenCount = (supplementLogsRes.data ?? []).filter(
        (l) => (l as { taken: boolean }).taken,
      ).length;
      const supplementPct = totalSupplements > 0 ? takenCount / totalSupplements : 0;
      const supplements = Math.round(supplementPct * MAX_SUPPLEMENT);

      // 2. Food score (5 pts per meal, max 4 meals = 20)
      const mealCount = Math.min(foodLogsRes.data?.length ?? 0, 4);
      const food = mealCount * 5;

      // 3. Exercise score (any exercise = 20)
      const hasExercise = (exerciseLogsRes.data?.length ?? 0) > 0;
      const exercise = hasExercise ? MAX_EXERCISE : 0;

      // 4. Skincare score (% of AM+PM routine steps done)
      let skincare = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
      const dailyLogData = dailyLogsRes.data as any;
      if (dailyLogData?.health_notes) {
        try {
          const parsed = JSON.parse(dailyLogData.health_notes as string);
          if (parsed?.skincare?.routineChecks?.[targetDate]) {
            const checks = parsed.skincare.routineChecks[targetDate] as Record<string, boolean>;
            const routineSteps = parsed.skincare?.routineSteps as Array<{ id: string; time: string }> | undefined;
            if (routineSteps) {
              // Count total AM + PM steps
              const amSteps = routineSteps.filter(
                (s) => s.time === 'am' || s.time === 'both',
              );
              const pmSteps = routineSteps.filter(
                (s) => s.time === 'pm' || s.time === 'both',
              );
              const totalSteps = amSteps.length + pmSteps.length;
              if (totalSteps > 0) {
                // Count done steps (keys are like "am-r1", "pm-r2")
                const doneCount = Object.values(checks).filter(Boolean).length;
                const skincarePct = Math.min(doneCount / totalSteps, 1);
                skincare = Math.round(skincarePct * MAX_SKINCARE);
              }
            }
          }
        } catch {
          // health_notes wasn't valid skincare JSON
        }
      }

      // 5. Check-in score (mood + energy both set = 10)
      const symptomData = symptomsRes.data as { mood: number | null; energy_level: number | null } | null;
      const hasMood = symptomData?.mood != null;
      const hasEnergy = symptomData?.energy_level != null;
      const checkin = hasMood && hasEnergy ? MAX_CHECKIN : 0;

      // 6. Weight score (logged today = 10)
      const hasWeight = (weightLogsRes.data?.length ?? 0) > 0;
      const weight = hasWeight ? MAX_WEIGHT : 0;

      const total = supplements + food + exercise + skincare + checkin + weight;

      const breakdown: ScoreBreakdown = {
        supplements,
        food,
        exercise,
        skincare,
        checkin,
        weight,
        total,
      };

      setScore(breakdown);

      // Persist to daily_scores table
      await persistScore(user.id, targetDate, breakdown);
    } catch (err: unknown) {
      console.error('Failed to calculate daily score:', err);
    } finally {
      setLoading(false);
    }
  }, [user, targetDate]);

  useEffect(() => {
    calculateScore();
  }, [calculateScore]);

  useFocusEffect(
    useCallback(() => {
      calculateScore();
    }, [calculateScore]),
  );

  return { score, loading, refresh: calculateScore };
}

/**
 * Persist score to daily_scores table (upsert by user_id + score_date).
 */
async function persistScore(
  userId: string,
  scoreDate: string,
  breakdown: ScoreBreakdown,
): Promise<void> {
  try {
    // Check if entry exists
    const { data: existing } = await supabase
      .from('daily_scores')
      .select('id')
      .eq('user_id', userId)
      .eq('score_date', scoreDate)
      .maybeSingle();

    const payload = {
      user_id: userId,
      score_date: scoreDate,
      supplement_score: breakdown.supplements,
      food_score: breakdown.food,
      exercise_score: breakdown.exercise,
      water_score: breakdown.skincare, // reusing water_score column for skincare
      sleep_score: breakdown.checkin + breakdown.weight, // combined check-in + weight
      total_score: breakdown.total,
      calories_consumed: 0,
      protein_consumed: 0,
      carbs_consumed: 0,
      fat_consumed: 0,
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
