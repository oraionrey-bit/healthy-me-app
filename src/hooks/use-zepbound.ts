import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type {
  ZepboundInjection,
  ZepboundInjectionSite,
  ZepboundSymptomLog,
} from '../types/database';
import {
  validateZepboundInjection,
  validateZepboundSymptom,
} from '../utils/zepbound-validation';

export interface NewZepboundInjection {
  injectionDate: string;
  injectionTime: string;
  doseMg: number;
  injectionSite: ZepboundInjectionSite;
  notes?: string;
}

export interface NewZepboundSymptom {
  logDate: string;
  symptomType: string;
  severity: number;
  notes?: string;
}

interface InsertOperation<T> {
  insert: (values: T) => PromiseLike<{ error: unknown | null }>;
}

interface RpcOperation {
  rpc: (
    functionName: 'save_zepbound_symptoms_for_date',
    args: { p_log_date: string; p_symptoms: Array<{ symptom_type: string; severity: number; notes: string | null }> },
  ) => PromiseLike<{ error: unknown | null }>;
}

/** One data source for both the dedicated Health tracker and Home's daily status. */
export function useZepbound() {
  const { user } = useAuth();
  const [injections, setInjections] = useState<ZepboundInjection[]>([]);
  const [symptoms, setSymptoms] = useState<ZepboundSymptomLog[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async (showLoading = false) => {
    if (!user) {
      setInjections([]);
      setSymptoms([]);
      setLoading(false);
      return;
    }

    if (showLoading) setLoading(true);
    try {
      const [injectionResult, symptomResult] = await Promise.all([
        supabase
          .from('zepbound_injections')
          .select('*')
          .eq('user_id', user.id)
          .order('injection_date', { ascending: false })
          .order('injection_time', { ascending: false }),
        supabase
          .from('zepbound_symptom_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('log_date', { ascending: false })
          .order('symptom_time', { ascending: false }),
      ]);

      if (injectionResult.error) throw injectionResult.error;
      if (symptomResult.error) throw symptomResult.error;
      setInjections(injectionResult.data ?? []);
      setSymptoms(symptomResult.data ?? []);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refetch(true);
  }, [refetch]);

  const saveInjection = useCallback(async (input: NewZepboundInjection) => {
    if (!user) return;
    const validationError = validateZepboundInjection(input);
    if (validationError) throw new Error(validationError);

    const payload = {
      user_id: user.id,
      injection_date: input.injectionDate,
      injection_time: input.injectionTime,
      dose_mg: input.doseMg,
      injection_site: input.injectionSite,
      notes: input.notes?.trim() || null,
    } satisfies Omit<ZepboundInjection, 'id' | 'created_at'>;
    // This project maintains its Database type by hand; narrow the latest
    // Supabase insert builder without weakening the feature payload to `any`.
    const injectionTable = supabase.from('zepbound_injections') as unknown as InsertOperation<typeof payload>;
    const { error } = await injectionTable.insert(payload);
    if (error) throw error;
    await refetch();
  }, [user, refetch]);

  const saveSymptoms = useCallback(async (inputs: NewZepboundSymptom[]) => {
    if (!user) return;
    if (inputs.length === 0) throw new Error('Choose one or more symptoms, or None.');
    const validationError = inputs.map(validateZepboundSymptom).find(Boolean);
    if (validationError) throw new Error(validationError);
    const logDate = inputs[0].logDate;
    if (inputs.some((input) => input.logDate !== logDate)) {
      throw new Error('Symptoms in one save must use the same date.');
    }
    const hasNone = inputs.some((input) => input.symptomType.trim() === 'None');
    if (hasNone && inputs.length !== 1) {
      throw new Error('None cannot be saved with other symptoms.');
    }

    const rpc = supabase as unknown as RpcOperation;
    const { error } = await rpc.rpc('save_zepbound_symptoms_for_date', {
      p_log_date: logDate,
      p_symptoms: inputs.map((input) => ({
        symptom_type: input.symptomType.trim(),
        severity: input.severity,
        notes: input.notes?.trim() || null,
      })),
    });
    if (error) throw error;
    await refetch();
  }, [user, refetch]);

  const deleteInjection = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('zepbound_injections')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw error;
    await refetch();
  }, [user, refetch]);

  const deleteSymptom = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('zepbound_symptom_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw error;
    await refetch();
  }, [user, refetch]);

  const lastInjection = injections[0] ?? null;
  const nextInjectionDate = useMemo(() => {
    if (!lastInjection) return null;
    const date = new Date(`${lastInjection.injection_date}T12:00:00`);
    date.setDate(date.getDate() + 7);
    return date;
  }, [lastInjection]);

  return {
    injections,
    symptoms,
    loading,
    lastInjection,
    nextInjectionDate,
    saveInjection,
    saveSymptoms,
    deleteInjection,
    deleteSymptom,
    refetch: () => refetch(true),
  };
}
