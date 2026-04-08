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

// ── Hook ──

export function useCalfTracker(date?: Date) {
  const { user } = useAuth();
  const [dailyLog, setDailyLog] = useState<CalfDailyLog>(EMPTY_LOG);
  const [measurements, setMeasurements] = useState<CalfMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyLogId, setDailyLogId] = useState<string | null>(null);

  const targetDate = date ?? new Date();
  const dateKey = toDateKey(targetDate);

  // Fetch daily log — read calf columns directly from daily_logs
  const fetchDailyLog = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('daily_logs')
        .select('id, wore_compression_socks, wore_calf_sleeves, stretched_minutes, calf_notes')
        .eq('user_id', user.id)
        .eq('log_date', dateKey)
        .maybeSingle();

      if (data) {
        setDailyLogId(data.id);
        setDailyLog({
          woreCompressionSocks: (data as any).wore_compression_socks ?? false,
          woreCalfSleeves: (data as any).wore_calf_sleeves ?? false,
          stretchedMinutes: (data as any).stretched_minutes ?? 0,
          notes: (data as any).calf_notes ?? '',
        });
      } else {
        setDailyLogId(null);
        setDailyLog(EMPTY_LOG);
      }
    } catch (err) {
      console.warn('Failed to fetch calf daily log:', err);
    }
  }, [user, dateKey]);

  // Fetch measurements from dedicated calf_measurements table
  const fetchMeasurements = useCallback(async () => {
    if (!user) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('calf_measurements') as any)
        .select('id, measure_date, left_calf_cm, right_calf_cm, ankle_flexion_degrees, notes')
        .eq('user_id', user.id)
        .order('measure_date', { ascending: true });

      const ms: CalfMeasurement[] = (data ?? []).map((row: any) => ({
        id: row.id,
        date: row.measure_date,
        leftCalf: Number(row.left_calf_cm),
        rightCalf: Number(row.right_calf_cm),
        ankleFlexion: Number(row.ankle_flexion_degrees ?? 0),
        notes: row.notes ?? '',
      }));
      setMeasurements(ms);
    } catch (err) {
      console.warn('Failed to fetch calf measurements:', err);
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchDailyLog(), fetchMeasurements()]).finally(() => setLoading(false));
  }, [fetchDailyLog, fetchMeasurements]);

  // Save daily log — write to dedicated columns
  const saveDailyLog = useCallback(
    async (update: Partial<CalfDailyLog>) => {
      if (!user) return;
      const newLog = { ...dailyLog, ...update };
      setDailyLog(newLog);

      const dbFields = {
        wore_compression_socks: newLog.woreCompressionSocks,
        wore_calf_sleeves: newLog.woreCalfSleeves,
        stretched_minutes: newLog.stretchedMinutes,
        calf_notes: newLog.notes || null,
      };

      if (dailyLogId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('daily_logs') as any)
          .update(dbFields)
          .eq('id', dailyLogId);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase.from('daily_logs') as any)
          .insert({
            user_id: user.id,
            log_date: dateKey,
            ...dbFields,
          })
          .select('id')
          .single();
        if (data) setDailyLogId(data.id);
      }
    },
    [user, dailyLog, dailyLogId, dateKey],
  );

  // Save a measurement to calf_measurements table
  const saveMeasurement = useCallback(
    async (m: Omit<CalfMeasurement, 'id' | 'date'>) => {
      if (!user) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('calf_measurements') as any)
        .upsert({
          user_id: user.id,
          measure_date: dateKey,
          left_calf_cm: m.leftCalf,
          right_calf_cm: m.rightCalf,
          ankle_flexion_degrees: m.ankleFlexion,
          notes: m.notes || null,
        }, { onConflict: 'user_id,measure_date' });

      await fetchMeasurements();
    },
    [user, dateKey, fetchMeasurements],
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
