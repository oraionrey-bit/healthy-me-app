import { toDateKey } from '../utils/storage';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useUserProfile } from './use-user-profile';
import { DEFAULT_SUPPLEMENTS } from '../constants/supplements';
import type { UserSupplement, SupplementLog } from '../types/database';

export function useSupplements() {
  const { user } = useAuth();
  const { isOnboarded } = useUserProfile();
  const [supplements, setSupplements] = useState<UserSupplement[]>([]);
  const [todaysLogs, setTodaysLogs] = useState<SupplementLog[]>([]);
  const [loading, setLoading] = useState(true);
  const seededRef = useRef(false);

  const takenCount = todaysLogs.filter((l) => l.taken).length;
  const totalCount = supplements.length;

  const morningSupplements = supplements.filter((s) => s.time_of_day === 'morning');
  const eveningSupplements = supplements.filter((s) => s.time_of_day === 'evening');

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
        .eq('log_date', toDateKey(new Date()));

      if (error) throw error;
      setTodaysLogs((data as SupplementLog[]) ?? []);
    } catch {
      // silently fail on logs fetch
    }
  }, [user]);

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
          log_date: toDateKey(new Date()),
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
    refetch: async () => {
      await fetchSupplements();
      await fetchTodaysLogs();
    },
  };
}
