import { toDateKey } from '../utils/storage';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useUserProfile } from './use-user-profile';
import { DEFAULT_SUPPLEMENTS } from '../constants/supplements';
import type { UserSupplement, SupplementLog, SupplementPhaseSchedule } from '../types/database';

// Feeling stored as JSON in supplement_logs.notes
export type SupplementFeeling = 'good' | 'neutral' | 'bad';

export interface FeelingEntry {
  feeling: SupplementFeeling;
  note?: string;
}

export function parseFeelingFromNotes(notes: string | null): FeelingEntry | null {
  if (!notes) return null;
  try {
    const parsed = JSON.parse(notes);
    if (parsed && typeof parsed === 'object' && parsed.feeling) return parsed as FeelingEntry;
  } catch {
    // plain text note, not a feeling entry
  }
  return null;
}

function encodeFeelingToNotes(feeling: SupplementFeeling, note?: string): string {
  return JSON.stringify({ feeling, note: note || undefined });
}

function canonicalIdentity(value: string): string {
  return value.trim().toLowerCase();
}

function distinctScheduleValues(timeOfDay: string): string[] {
  return Array.from(new Set(
    timeOfDay
      .split(',')
      .map(canonicalIdentity)
      .filter(Boolean),
  ));
}

export function useSupplements(date?: Date) {
  const { user } = useAuth();
  const { isOnboarded } = useUserProfile();
  const [supplements, setSupplements] = useState<UserSupplement[]>([]);
  const [todaysLogs, setTodaysLogs] = useState<SupplementLog[]>([]);
  const [loading, setLoading] = useState(true);
  const seededRef = useRef(false);

  // Use provided date or default to today
  const targetDate = date ?? new Date();
  const targetDateKey = toDateKey(targetDate);

  const takenCount = todaysLogs.filter((l) => l.taken).length;
  const totalCount = supplements.length;

  const morningSupplements = supplements.filter((s) => s.time_of_day.includes('morning'));
  const eveningSupplements = supplements.filter((s) => s.time_of_day.includes('evening'));

  const seedDefaults = useCallback(async () => {
    if (!user || seededRef.current) return false;
    seededRef.current = true;

    const rows = DEFAULT_SUPPLEMENTS.map((s) => ({
      user_id: user.id,
      supplement_name: s.supplement_name,
      dosage: s.dosage,
      frequency: 'daily',
      time_of_day: s.time_of_day,
      notes: null,
      is_active: true,
      sort_order: s.sort_order,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
    const { error } = await (supabase.from('user_supplements') as any).insert(rows);
    return !error;
  }, [user]);

  const fetchSupplements = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_supplements')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      const rows = (data as UserSupplement[]) ?? [];

      // Seed defaults only if user has no supplements AND hasn't been through onboarding
      if (rows.length === 0 && !isOnboarded) {
        const seeded = await seedDefaults();
        if (seeded) {
          const { data: seededData } = await supabase
            .from('user_supplements')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .order('sort_order', { ascending: true });
          setSupplements((seededData as UserSupplement[]) ?? []);
          return;
        }
      }

      setSupplements(rows);
    } finally {
      setLoading(false);
    }
  }, [user, seedDefaults, isOnboarded]);

  const fetchTodaysLogs = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('supplement_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('log_date', targetDateKey);

      if (error) throw error;
      setTodaysLogs((data as SupplementLog[]) ?? []);
    } catch (err) {
      console.warn('Failed to fetch supplement logs:', err);
    }
  }, [user, targetDateKey]);

  useEffect(() => {
    fetchSupplements();
    fetchTodaysLogs();
  }, [fetchSupplements, fetchTodaysLogs]);

  const isSupplementTaken = useCallback(
    (userSupplementId: string): boolean => {
      return todaysLogs.some(
        (l) => l.user_supplement_id === userSupplementId && l.taken,
      );
    },
    [todaysLogs],
  );

  const toggleSupplement = useCallback(
    async (userSupplementId: string) => {
      if (!user) return;

      const currentlyTaken = isSupplementTaken(userSupplementId);
      const newTaken = !currentlyTaken;
      const existing = todaysLogs.find(
        (l) => l.user_supplement_id === userSupplementId,
      );

      if (existing) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
        const { error } = await (supabase.from('supplement_logs') as any)
          .update({
            taken: newTaken,
            taken_at: newTaken ? new Date().toISOString() : null,
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
        const { error } = await (supabase.from('supplement_logs') as any).insert({
          user_id: user.id,
          user_supplement_id: userSupplementId,
          log_date: targetDateKey,
          taken: newTaken,
          taken_at: newTaken ? new Date().toISOString() : null,
          notes: null,
        });
        if (error) throw error;
      }

      await fetchTodaysLogs();
    },
    [user, todaysLogs, isSupplementTaken, fetchTodaysLogs],
  );

  // ── CRUD Operations ──

  const addSupplement = useCallback(
    async (name: string, dosage: string, timeOfDay: string, notes?: string) => {
      if (!user) return;

      // A scheduled dose is its own tracker entry. Keeping morning and evening
      // rows distinct gives each checkbox and daily log a stable, unique ID.
      const normalizedName = name.trim();
      const scheduledTimes = distinctScheduleValues(timeOfDay);
      let nextSortOrder = supplements.reduce(
        (max, supplement) => Math.max(max, supplement.sort_order),
        -1,
      ) + 1;

      for (const scheduledTime of scheduledTimes) {
        const existing = supplements.find(
          (supplement) =>
            canonicalIdentity(supplement.supplement_name) === canonicalIdentity(normalizedName)
            && canonicalIdentity(supplement.time_of_day) === scheduledTime,
        );
        if (existing) continue;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
        const { error } = await (supabase.from('user_supplements') as any).insert({
          user_id: user.id,
          supplement_name: normalizedName,
          dosage: dosage || null,
          frequency: 'daily',
          time_of_day: scheduledTime,
          notes: notes || null,
          is_active: true,
          sort_order: nextSortOrder,
        });

        if (error) throw error;
        nextSortOrder += 1;
      }

      await fetchSupplements();
    },
    [user, supplements, fetchSupplements],
  );

  const updateSupplement = useCallback(
    async (id: string, updates: Partial<Pick<UserSupplement, 'supplement_name' | 'dosage' | 'time_of_day' | 'is_active' | 'notes'>>) => {
      if (!user) return;

      const current = supplements.find((supplement) => supplement.id === id);
      if (!current) return;

      const normalizedName = (updates.supplement_name ?? current.supplement_name).trim();
      const scheduledTimes = distinctScheduleValues(updates.time_of_day ?? current.time_of_day);
      if (scheduledTimes.length === 0) throw new Error('A supplement schedule is required.');

      const [primaryTime, ...additionalTimes] = scheduledTimes;
      const duplicatePrimary = supplements.some(
        (supplement) => supplement.id !== id
          && canonicalIdentity(supplement.supplement_name) === canonicalIdentity(normalizedName)
          && canonicalIdentity(supplement.time_of_day) === primaryTime,
      );
      if (duplicatePrimary) {
        throw new Error(`${normalizedName} already has a ${primaryTime} schedule.`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
      const { error } = await (supabase.from('user_supplements') as any)
        .update({
          ...updates,
          supplement_name: normalizedName,
          time_of_day: primaryTime,
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      let nextSortOrder = supplements.reduce(
        (max, supplement) => Math.max(max, supplement.sort_order),
        -1,
      ) + 1;
      for (const scheduledTime of additionalTimes) {
        const alreadyExists = supplements.some(
          (supplement) => supplement.id !== id
            && canonicalIdentity(supplement.supplement_name) === canonicalIdentity(normalizedName)
            && canonicalIdentity(supplement.time_of_day) === scheduledTime,
        );
        if (alreadyExists) continue;

        // Never persist a comma-combined schedule, even if a stale caller sends one.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
        const { error: insertError } = await (supabase.from('user_supplements') as any).insert({
          user_id: user.id,
          supplement_name: normalizedName,
          dosage: updates.dosage ?? current.dosage,
          frequency: current.frequency,
          time_of_day: scheduledTime,
          notes: updates.notes ?? current.notes,
          is_active: updates.is_active ?? current.is_active,
          sort_order: nextSortOrder,
          phase_schedule: current.phase_schedule,
        });
        if (insertError) throw insertError;
        nextSortOrder += 1;
      }

      await fetchSupplements();
    },
    [user, supplements, fetchSupplements],
  );

  const deleteSupplement = useCallback(
    async (id: string) => {
      if (!user) return;

      // Soft delete — set is_active = false
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
      const { error } = await (supabase.from('user_supplements') as any)
        .update({ is_active: false })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      await fetchSupplements();
    },
    [user, fetchSupplements],
  );

  // ── Feeling Tracking ──

  const logFeeling = useCallback(
    async (userSupplementId: string, feeling: SupplementFeeling, note?: string) => {
      if (!user) return;

      const existing = todaysLogs.find(
        (l) => l.user_supplement_id === userSupplementId,
      );

      const notesJson = encodeFeelingToNotes(feeling, note);

      if (existing) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
        const { error } = await (supabase.from('supplement_logs') as any)
          .update({ notes: notesJson })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
        const { error } = await (supabase.from('supplement_logs') as any).insert({
          user_id: user.id,
          user_supplement_id: userSupplementId,
          log_date: targetDateKey,
          taken: true,
          taken_at: new Date().toISOString(),
          notes: notesJson,
        });
        if (error) throw error;
      }

      await fetchTodaysLogs();
    },
    [user, todaysLogs, targetDateKey, fetchTodaysLogs],
  );

  const getFeelingForToday = useCallback(
    (userSupplementId: string): FeelingEntry | null => {
      const log = todaysLogs.find(
        (l) => l.user_supplement_id === userSupplementId,
      );
      return log ? parseFeelingFromNotes(log.notes) : null;
    },
    [todaysLogs],
  );

  // ── Phase Advancement ──

  const advancePhase = useCallback(
    async (supplementId: string, nextPhase: number) => {
      if (!user) return;

      const supp = supplements.find((s) => s.id === supplementId);
      if (!supp?.phase_schedule) return;

      const today = new Date().toISOString().split('T')[0];
      const updatedSchedule: SupplementPhaseSchedule = {
        ...supp.phase_schedule,
        current_phase: nextPhase,
        phase_started_at: today,
      };

      // Also update the dosage field to reflect the new phase
      const newPhaseData = updatedSchedule.phases.find((p) => p.phase === nextPhase);
      const newDosage = newPhaseData?.dosage ?? supp.dosage;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
      const { error } = await (supabase.from('user_supplements') as any)
        .update({
          phase_schedule: updatedSchedule,
          dosage: newDosage,
        })
        .eq('id', supplementId)
        .eq('user_id', user.id);

      if (error) throw error;
      await fetchSupplements();
    },
    [user, supplements, fetchSupplements],
  );

  // ── Reorder ──

  const reorderSupplements = useCallback(
    async (orderedIds: string[]) => {
      if (!user) return;

      const updates = orderedIds.map((id, idx) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
        (supabase.from('user_supplements') as any)
          .update({ sort_order: idx })
          .eq('id', id)
          .eq('user_id', user.id),
      );

      await Promise.all(updates);
      await fetchSupplements();
    },
    [user, fetchSupplements],
  );

  return {
    supplements,
    morningSupplements,
    eveningSupplements,
    todaysLogs,
    takenCount,
    totalCount,
    loading,
    isSupplementTaken,
    toggleSupplement,
    addSupplement,
    updateSupplement,
    deleteSupplement,
    logFeeling,
    getFeelingForToday,
    advancePhase,
    reorderSupplements,
    refetch: async () => {
      await fetchSupplements();
      await fetchTodaysLogs();
    },
  };
}
