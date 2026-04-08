import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { toDateKey } from '../utils/storage';

// ── Types ──

export interface CalfDailyLog {
  woreCompressionSocks: boolean;
  woreCalfSleeves: boolean;
  stretchedMinutes: number;
  notes: string;
}

export interface CalfMeasurement {
  id: string;
  date: string;
  leftCalf: number; // cm
  rightCalf: number; // cm
  ankleFlexion: number; // degrees from 90° perpendicular
  notes: string;
}

const EMPTY_LOG: CalfDailyLog = {
  woreCompressionSocks: false,
  woreCalfSleeves: false,
  stretchedMinutes: 0,
  notes: '',
};

const STORAGE_KEY = 'calfTracker';

// ── Parse/encode from daily_logs.health_notes ──

function parseCalfData(healthNotes: string | null): CalfDailyLog | null {
  if (!healthNotes) return null;
  try {
    const parsed = JSON.parse(healthNotes);
    if (parsed && typeof parsed === 'object' && parsed[STORAGE_KEY]) {
      return parsed[STORAGE_KEY] as CalfDailyLog;
    }
  } catch {
    // Not JSON or no calf data
  }
  return null;
}

function mergeCalfIntoNotes(existing: string | null, calf: CalfDailyLog): string {
  let obj: Record<string, unknown> = {};
  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      if (parsed && typeof parsed === 'object') obj = parsed;
    } catch {
      // Plain text — preserve it
      obj = { text: existing };
    }
  }
  obj[STORAGE_KEY] = calf;
  return JSON.stringify(obj);
}

// ── Hook ──

export function useCalfTracker(date?: Date) {
  const { user } = useAuth();
  const [dailyLog, setDailyLog] = useState<CalfDailyLog>(EMPTY_LOG);
  const [measurements, setMeasurements] = useState<CalfMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [rawHealthNotes, setRawHealthNotes] = useState<string | null>(null);
  const [dailyLogId, setDailyLogId] = useState<string | null>(null);

  const targetDate = date ?? new Date();
  const dateKey = toDateKey(targetDate);

  // Fetch daily log
  const fetchDailyLog = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('daily_logs')
        .select('id, health_notes')
        .eq('user_id', user.id)
        .eq('log_date', dateKey)
        .maybeSingle();

      if (data) {
        setDailyLogId(data.id);
        setRawHealthNotes(data.health_notes);
        const parsed = parseCalfData(data.health_notes);
        setDailyLog(parsed ?? EMPTY_LOG);
      } else {
        setDailyLogId(null);
        setRawHealthNotes(null);
        setDailyLog(EMPTY_LOG);
      }
    } catch (err) {
      console.warn('Failed to fetch calf daily log:', err);
    }
  }, [user, dateKey]);

  // Fetch measurements (all-time, sorted by date)
  const fetchMeasurements = useCallback(async () => {
    if (!user) return;
    try {
      // Measurements stored in a JSON file since we don't have a dedicated table
      // Use daily_logs entries that have calfMeasurement in health_notes
      const { data } = await supabase
        .from('daily_logs')
        .select('id, log_date, health_notes')
        .eq('user_id', user.id)
        .order('log_date', { ascending: true });

      const ms: CalfMeasurement[] = [];
      for (const row of data ?? []) {
        if (!row.health_notes) continue;
        try {
          const parsed = JSON.parse(row.health_notes);
          if (parsed?.calfMeasurement) {
            ms.push({
              id: row.id,
              date: row.log_date,
              ...parsed.calfMeasurement,
            });
          }
        } catch {
          // skip
        }
      }
      setMeasurements(ms);
    } catch (err) {
      console.warn('Failed to fetch calf measurements:', err);
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchDailyLog(), fetchMeasurements()]).finally(() => setLoading(false));
  }, [fetchDailyLog, fetchMeasurements]);

  // Save daily log
  const saveDailyLog = useCallback(
    async (update: Partial<CalfDailyLog>) => {
      if (!user) return;
      const newLog = { ...dailyLog, ...update };
      setDailyLog(newLog);

      const healthNotes = mergeCalfIntoNotes(rawHealthNotes, newLog);

      if (dailyLogId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('daily_logs') as any)
          .update({ health_notes: healthNotes })
          .eq('id', dailyLogId);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase.from('daily_logs') as any)
          .insert({
            user_id: user.id,
            log_date: dateKey,
            health_notes: healthNotes,
          })
          .select('id')
          .single();
        if (data) setDailyLogId(data.id);
      }
      setRawHealthNotes(healthNotes);
    },
    [user, dailyLog, rawHealthNotes, dailyLogId, dateKey],
  );

  // Save a measurement
  const saveMeasurement = useCallback(
    async (m: Omit<CalfMeasurement, 'id' | 'date'>) => {
      if (!user) return;

      // Merge measurement into today's health_notes
      let obj: Record<string, unknown> = {};
      if (rawHealthNotes) {
        try {
          const parsed = JSON.parse(rawHealthNotes);
          if (parsed && typeof parsed === 'object') obj = parsed;
        } catch {
          obj = { text: rawHealthNotes };
        }
      }
      obj.calfMeasurement = m;
      // Also preserve calf tracker data
      obj[STORAGE_KEY] = dailyLog;
      const healthNotes = JSON.stringify(obj);

      if (dailyLogId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('daily_logs') as any)
          .update({ health_notes: healthNotes })
          .eq('id', dailyLogId);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase.from('daily_logs') as any)
          .insert({
            user_id: user.id,
            log_date: dateKey,
            health_notes: healthNotes,
          })
          .select('id')
          .single();
        if (data) setDailyLogId(data.id);
      }

      setRawHealthNotes(healthNotes);
      await fetchMeasurements();
    },
    [user, rawHealthNotes, dailyLog, dailyLogId, dateKey, fetchMeasurements],
  );

  // Computed stats
  const stretchGoalMinutes = 60;
  const stretchProgress = Math.min(dailyLog.stretchedMinutes / stretchGoalMinutes, 1);
  const dailyChecklist = [
    dailyLog.woreCompressionSocks,
    dailyLog.woreCalfSleeves,
    dailyLog.stretchedMinutes >= 20, // at least one session
  ];
  const completedCount = dailyChecklist.filter(Boolean).length;

  return {
    dailyLog,
    measurements,
    loading,
    saveDailyLog,
    saveMeasurement,
    stretchGoalMinutes,
    stretchProgress,
    completedCount,
    totalChecklist: dailyChecklist.length,
    refetch: async () => {
      await fetchDailyLog();
      await fetchMeasurements();
    },
  };
}
