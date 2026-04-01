import { toDateKey } from '../utils/storage';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { SymptomLog, SymptomType } from '../types/database';


interface AddSymptomInput {
  symptom_type: SymptomType;
  severity: number;
  notes?: string;
  triggers?: string;
}

export function useSymptomLog() {
  const { user } = useAuth();
  const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSymptomLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('symptom_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('log_date', toDateKey(new Date()));

      if (error) throw error;
      setSymptomLogs((data as SymptomLog[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSymptomLogs();
  }, [fetchSymptomLogs]);

  const addSymptom = useCallback(
    async (input: AddSymptomInput) => {
      if (!user) return;

      // DB constraint: severity must be 'mild' | 'moderate' | 'severe'
      // UI uses numbers 1-5, so map: 1-2 = mild, 3 = moderate, 4-5 = severe
      const severityMap: Record<number, string> = {
        1: 'mild', 2: 'mild', 3: 'moderate', 4: 'severe', 5: 'severe',
      };
      const severityText = severityMap[input.severity] ?? 'moderate';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
      const { error } = await (supabase.from('symptom_logs') as any).insert({
        user_id: user.id,
        symptom_type: input.symptom_type,
        severity: severityText,
        notes: input.notes ?? null,
        triggers: input.triggers ?? null,
        log_date: toDateKey(new Date()),
      });

      if (error) {
        console.error('Failed to save symptom:', error.message);
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
    removeSymptom,
    refetch: fetchSymptomLogs,
  };
}
