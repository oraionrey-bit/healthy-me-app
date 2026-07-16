import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type {
  ZepboundInjection,
  ZepboundInjectionSite,
  ZepboundSymptomLog,
} from '../types/database';

export interface NewZepboundInjection {
  injectionDate: string;
  injectionTime: string;
  doseMg: number;
  injectionSite: ZepboundInjectionSite;
  notes?: string;
}

export interface NewZepboundSymptom {
  logDate: string;
  symptomTime: string;
  symptomType: string;
  severity: number;
  notes?: string;
}

/** One data source for both the dedicated Health tracker and Home's daily status. */
export function useZepbound() {
  const { user } = useAuth();
  const [injections, setInjections] = useState<ZepboundInjection[]>([]);
  const [symptoms, setSymptoms] = useState<ZepboundSymptomLog[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) {
      setInjections([]);
      setSymptoms([]);
      setLoading(false);
      return;
    }

    setLoading(true);
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
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const saveInjection = useCallback(async (input: NewZepboundInjection) => {
    if (!user) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- hand-maintained Supabase types do not infer inserts
    const { error } = await (supabase.from('zepbound_injections') as any).insert({
      user_id: user.id,
      injection_date: input.injectionDate,
      injection_time: input.injectionTime,
      dose_mg: input.doseMg,
      injection_site: input.injectionSite,
      notes: input.notes?.trim() || null,
    });
    if (error) throw error;
    await refetch();
  }, [user, refetch]);

  const saveSymptom = useCallback(async (input: NewZepboundSymptom) => {
    if (!user) return;
    const relatedInjection = injections.find(
      (injection) => injection.injection_date <= input.logDate,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- hand-maintained Supabase types do not infer inserts
    const { error } = await (supabase.from('zepbound_symptom_logs') as any).insert({
      user_id: user.id,
      injection_id: relatedInjection?.id ?? null,
      log_date: input.logDate,
      symptom_time: input.symptomTime,
      symptom_type: input.symptomType.trim(),
      severity: input.severity,
      notes: input.notes?.trim() || null,
    });
    if (error) throw error;
    await refetch();
  }, [user, injections, refetch]);

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
    saveSymptom,
    deleteInjection,
    deleteSymptom,
    refetch,
  };
}
