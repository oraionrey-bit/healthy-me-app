import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { SkinPlan, SkinPlanRow, rowToPlan, Phase, isProductScheduled, RoutineStep } from '../types/skin-plan';
import { toDateKey } from '../utils/storage';

export function useSkinPlan() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<SkinPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPlan = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('skin_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      setPlan(data ? rowToPlan(data as unknown as SkinPlanRow) : null);
    } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  const advancePhase = useCallback(async () => {
    if (!plan || !user) return;
    const nextIndex = plan.activePhaseIndex + 1;
    if (nextIndex >= plan.phases.length) return;
    const updatedPhases = plan.phases.map((p, i) => {
      if (i === plan.activePhaseIndex) return { ...p, status: 'completed' as const };
      if (i === nextIndex) return { ...p, status: 'active' as const, startDate: toDateKey(new Date()) };
      return p;
    });
    const { error } = await (supabase.from('skin_plans') as any)
      .update({ phases: updatedPhases, active_phase_index: nextIndex, updated_at: new Date().toISOString() })
      .eq('id', plan.id);
    if (error) throw error;
    await fetchPlan();
  }, [plan, user, fetchPlan]);

  const revertPhase = useCallback(async () => {
    if (!plan || !user || plan.activePhaseIndex === 0) return;
    const prevIndex = plan.activePhaseIndex - 1;
    const updatedPhases = plan.phases.map((p, i) => {
      if (i === plan.activePhaseIndex) return { ...p, status: 'upcoming' as const, startDate: null };
      if (i === prevIndex) return { ...p, status: 'active' as const };
      return p;
    });
    const { error } = await (supabase.from('skin_plans') as any)
      .update({ phases: updatedPhases, active_phase_index: prevIndex, updated_at: new Date().toISOString() })
      .eq('id', plan.id);
    if (error) throw error;
    await fetchPlan();
  }, [plan, user, fetchPlan]);

  // Get today's routine from active phase
  const getTodayRoutine = useCallback((p: SkinPlan | null) => {
    if (!p) return { am: [] as RoutineStep[], pm: [] as RoutineStep[] };
    const activePhase = p.phases[p.activePhaseIndex];
    if (!activePhase) return { am: [], pm: [] };
    const today = new Date();
    return {
      am: activePhase.amRoutine.filter(s => isProductScheduled(s, today, activePhase.startDate)),
      pm: activePhase.pmRoutine.filter(s => isProductScheduled(s, today, activePhase.startDate)),
    };
  }, []);

  const getPhaseProgress = useCallback((p: SkinPlan | null) => {
    if (!p) return { daysIn: 0, totalDays: 0, percent: 0 };
    const phase = p.phases[p.activePhaseIndex];
    if (!phase?.startDate) return { daysIn: 0, totalDays: phase?.durationWeeks ? phase.durationWeeks * 7 : 0, percent: 0 };
    const start = new Date(phase.startDate);
    const now = new Date();
    const daysIn = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86400000));
    const totalDays = phase.durationWeeks * 7;
    return { daysIn, totalDays, percent: Math.min(100, Math.round((daysIn / totalDays) * 100)) };
  }, []);

  return { plan, loading, advancePhase, revertPhase, getTodayRoutine, getPhaseProgress, refetch: fetchPlan };
}
