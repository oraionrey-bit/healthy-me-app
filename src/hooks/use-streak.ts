import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { toDateKey } from '../utils/storage';

/** Milestone thresholds that trigger celebration */
export const STREAK_MILESTONES = [3, 7, 14, 30] as const;

interface UseStreakReturn {
  currentStreak: number;
  bestStreak: number;
  todayScore: number;
  loading: boolean;
  /** Whether today's streak just hit a milestone */
  isMilestone: boolean;
  refresh: () => Promise<void>;
}

/**
 * Streak counter hook.
 *
 * Counts consecutive days with score ≥ threshold (default 50).
 * A "rest day" with score ≥ gentleThreshold (default 30) still counts.
 *
 * Fetches last 30 days of daily_scores, counts backward from today.
 */
export function useStreak(
  threshold = 50,
  gentleThreshold = 30,
): UseStreakReturn {
  const { user } = useAuth();
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [todayScore, setTodayScore] = useState(0);
  const [isMilestone, setIsMilestone] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchStreak = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get date 30 days ago
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);

      const { data, error } = await supabase
        .from('daily_scores')
        .select('score_date, total_score')
        .eq('user_id', user.id)
        .gte('score_date', toDateKey(thirtyDaysAgo))
        .lte('score_date', toDateKey(now))
        .order('score_date', { ascending: false });

      if (error) throw error;

      const scores = (data ?? []) as Array<{
        score_date: string;
        total_score: number;
      }>;

      // Build a map of date → score
      const scoreMap = new Map<string, number>();
      for (const row of scores) {
        scoreMap.set(row.score_date, row.total_score);
      }

      // Today's score
      const todayKey = toDateKey(now);
      const todayVal = scoreMap.get(todayKey) ?? 0;
      setTodayScore(todayVal);

      // Count current streak backward from today
      let streak = 0;
      const cursor = new Date(now);
      for (let i = 0; i < 31; i++) {
        const key = toDateKey(cursor);
        const dayScore = scoreMap.get(key);

        if (dayScore === undefined) {
          // No score logged for this day — streak broken
          // But only break if it's not today (user might not have logged yet today)
          if (i === 0) {
            // Today with no score yet — check if yesterday continues
            cursor.setDate(cursor.getDate() - 1);
            continue;
          }
          break;
        }

        if (dayScore >= threshold) {
          // Full day — counts
          streak++;
        } else if (dayScore >= gentleThreshold) {
          // Rest day — still counts (gentle threshold)
          streak++;
        } else {
          // Below gentle threshold — streak broken
          if (i === 0) {
            // Today's score is low but day isn't over — don't break
            cursor.setDate(cursor.getDate() - 1);
            continue;
          }
          break;
        }

        cursor.setDate(cursor.getDate() - 1);
      }

      setCurrentStreak(streak);

      // Calculate best streak across the 30-day window
      let best = 0;
      let runningStreak = 0;
      // Sort ascending for best streak calculation
      const sortedDates = Array.from(scoreMap.entries()).sort(
        ([a], [b]) => a.localeCompare(b),
      );

      for (let i = 0; i < sortedDates.length; i++) {
        const [dateStr, score] = sortedDates[i];

        if (score >= gentleThreshold) {
          // Check if this date is consecutive with the previous
          if (i === 0) {
            runningStreak = 1;
          } else {
            const prevDate = new Date(sortedDates[i - 1][0] + 'T00:00:00');
            const currDate = new Date(dateStr + 'T00:00:00');
            const diffMs = currDate.getTime() - prevDate.getTime();
            const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
              runningStreak++;
            } else {
              runningStreak = 1;
            }
          }

          best = Math.max(best, runningStreak);
        } else {
          runningStreak = 0;
        }
      }

      setBestStreak(Math.max(best, streak));

      // Check if current streak is a milestone
      setIsMilestone(
        STREAK_MILESTONES.includes(streak as typeof STREAK_MILESTONES[number]),
      );
    } catch (err) {
      console.error('Failed to fetch streak:', err);
    } finally {
      setLoading(false);
    }
  }, [user, threshold, gentleThreshold]);

  useEffect(() => {
    fetchStreak();
  }, [fetchStreak]);

  useFocusEffect(
    useCallback(() => {
      fetchStreak();
    }, [fetchStreak]),
  );

  return {
    currentStreak,
    bestStreak,
    todayScore,
    loading,
    isMilestone,
    refresh: fetchStreak,
  };
}
