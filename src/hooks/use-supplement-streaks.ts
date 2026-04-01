import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { toDateKey } from '../utils/storage';

interface SupplementStreak {
  currentStreak: number;
  bestStreak: number;
  /** Adherence % over last 7 days */
  weeklyAdherence: number;
  /** Adherence % over last 30 days */
  monthlyAdherence: number;
  /** Days with 100% completion in last 30 */
  perfectDays: number;
  /** Per-supplement consistency data */
  perSupplement: Array<{
    supplementId: string;
    name: string;
    takenDays: number;
    totalDays: number;
    adherencePct: number;
  }>;
  /** Daily completion data for heatmap (last 30 days) */
  dailyHistory: Array<{
    date: string;
    taken: number;
    total: number;
    pct: number;
  }>;
}

/**
 * Tracks supplement consistency: streaks, adherence rates, per-supplement breakdown.
 * Looks at the last 30 days of supplement_logs and user_supplements.
 */
export function useSupplementStreaks(): {
  data: SupplementStreak | null;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const { user } = useAuth();
  const [data, setData] = useState<SupplementStreak | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStreaks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);

      // Get active supplements
      const { data: supplements, error: suppError } = await supabase
        .from('user_supplements')
        .select('id, supplement_name')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (suppError || !supplements?.length) {
        setData(null);
        return;
      }

      const suppList = supplements as Array<{ id: string; supplement_name: string }>;
      const totalSupps = suppList.length;

      // Get logs for last 30 days
      const { data: logs, error: logError } = await supabase
        .from('supplement_logs')
        .select('user_supplement_id, log_date, taken')
        .eq('user_id', user.id)
        .gte('log_date', toDateKey(thirtyDaysAgo))
        .lte('log_date', toDateKey(now));

      if (logError) throw logError;
      const logRows = (logs ?? []) as Array<{ user_supplement_id: string; log_date: string; taken: boolean }>;

      // Build daily map: date → set of taken supplement IDs
      const dailyMap = new Map<string, Set<string>>();
      for (const log of logRows) {
        if (!log.taken) continue;
        const set = dailyMap.get(log.log_date) ?? new Set();
        set.add(log.user_supplement_id);
        dailyMap.set(log.log_date, set);
      }

      // Build daily history for last 30 days
      const dailyHistory: SupplementStreak['dailyHistory'] = [];
      const cursor = new Date(now);
      for (let i = 0; i < 30; i++) {
        const key = toDateKey(cursor);
        const takenSet = dailyMap.get(key);
        const taken = takenSet?.size ?? 0;
        dailyHistory.push({
          date: key,
          taken,
          total: totalSupps,
          pct: totalSupps > 0 ? Math.round((taken / totalSupps) * 100) : 0,
        });
        cursor.setDate(cursor.getDate() - 1);
      }
      dailyHistory.reverse(); // chronological order

      // Streak: consecutive days with 100% completion
      let currentStreak = 0;
      let bestStreak = 0;
      let runningStreak = 0;

      // Count backward from today for current streak
      const streakCursor = new Date(now);
      for (let i = 0; i < 30; i++) {
        const key = toDateKey(streakCursor);
        const takenSet = dailyMap.get(key);
        const taken = takenSet?.size ?? 0;
        if (taken >= totalSupps) {
          currentStreak++;
        } else {
          // Skip today if nothing logged yet
          if (i === 0 && taken === 0) {
            streakCursor.setDate(streakCursor.getDate() - 1);
            continue;
          }
          break;
        }
        streakCursor.setDate(streakCursor.getDate() - 1);
      }

      // Best streak from daily history
      for (const day of dailyHistory) {
        if (day.pct >= 100) {
          runningStreak++;
          bestStreak = Math.max(bestStreak, runningStreak);
        } else {
          runningStreak = 0;
        }
      }
      bestStreak = Math.max(bestStreak, currentStreak);

      // Adherence calculations
      const last7 = dailyHistory.slice(-7);
      const weeklyAdherence = last7.length > 0
        ? Math.round(last7.reduce((s, d) => s + d.pct, 0) / last7.length)
        : 0;
      const monthlyAdherence = dailyHistory.length > 0
        ? Math.round(dailyHistory.reduce((s, d) => s + d.pct, 0) / dailyHistory.length)
        : 0;
      const perfectDays = dailyHistory.filter((d) => d.pct >= 100).length;

      // Per-supplement consistency
      const perSupplement = suppList.map((supp) => {
        const suppLogs = logRows.filter(
          (l) => l.user_supplement_id === supp.id && l.taken,
        );
        const uniqueDays = new Set(suppLogs.map((l) => l.log_date)).size;
        return {
          supplementId: supp.id,
          name: supp.supplement_name,
          takenDays: uniqueDays,
          totalDays: 30,
          adherencePct: Math.round((uniqueDays / 30) * 100),
        };
      }).sort((a, b) => b.adherencePct - a.adherencePct);

      setData({
        currentStreak,
        bestStreak,
        weeklyAdherence,
        monthlyAdherence,
        perfectDays,
        perSupplement,
        dailyHistory,
      });
    } catch (err) {
      console.error('Failed to fetch supplement streaks:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStreaks();
  }, [fetchStreaks]);

  return { data, loading, refresh: fetchStreaks };
}
