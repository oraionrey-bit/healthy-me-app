import { toDateKey } from '../utils/storage';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { SymptomLog, SymptomType } from '../types/database';

interface AddSymptomInput {
  symptom_type: SymptomType;
  severity: number;
  notes?: string;
  triggers?: string;
}

const SEVERITY_MAP: Record<number, string> = {
  1: 'mild', 2: 'mild', 3: 'moderate', 4: 'severe', 5: 'severe',
};

/**
 * useSymptomLog — symptom logs for a given day.
 *
 * `date` defaults to today (May 7 bundle: hook accepts `date?: Date`).
 */
export function useSymptomLog(date: Date = new Date()) {
  const { user } = useAuth();
  const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>([]);
  const [loading, setLoading] = useState(true);
  const dateKey = useMemo(() => toDateKey(date), [date]);

  const fetchSymptomLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('symptom_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('log_date', dateKey);

      if (error) throw error;
      setSymptomLogs((data as SymptomLog[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [user, dateKey]);

  useEffect(() => {
    fetchSymptomLogs();
  }, [fetchSymptomLogs]);

  const addSymptom = useCallback(
    async (input: AddSymptomInput) => {
      if (!user) return;

      const severityText = SEVERITY_MAP[input.severity] ?? 'moderate';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
      const { error } = await (supabase.from('symptom_logs') as any).insert({
        user_id: user.id,
        symptom_type: input.symptom_type,
        severity: severityText,
        notes: input.notes ?? null,
        triggers: input.triggers ?? null,
        log_date: dateKey,
      });

      if (error) {
        console.error('Failed to save symptom:', error.message);
        throw error;
      }
      await fetchSymptomLogs();
    },
    [user, dateKey, fetchSymptomLogs],
  );

  const updateSymptomLog = useCallback(
    async (id: string, input: { severity: number; notes?: string }) => {
      if (!user) return;

      const severityText = SEVERITY_MAP[input.severity] ?? 'moderate';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
      const { error } = await (supabase.from('symptom_logs') as any)
        .update({
          severity: severityText,
          notes: input.notes ?? null,
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to update symptom:', error.message);
        throw error;
      }
      await fetchSymptomLogs();
    },
    [user, fetchSymptomLogs],
  );

  const removeSymptom = useCallback(
    async (id: string) => {
      if (!user) return;

      const { error } = await supabase
        .from('symptom_logs')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      await fetchSymptomLogs();
    },
    [user, fetchSymptomLogs],
  );

  return {
    symptomLogs,
    loading,
    addSymptom,
    updateSymptomLog,
    removeSymptom,
    refetch: fetchSymptomLogs,
  };
}
