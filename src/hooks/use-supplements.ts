import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { UserSupplement, SupplementLog } from '../types/database';

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function useSupplements() {
  const { user } = useAuth();
  const [supplements, setSupplements] = useState<UserSupplement[]>([]);
  const [todaysLogs, setTodaysLogs] = useState<SupplementLog[]>([]);
  const [loading, setLoading] = useState(true);

  const takenCount = todaysLogs.filter((l) => l.taken).length;
  const totalCount = supplements.length;

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
      setSupplements((data as UserSupplement[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchTodaysLogs = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('supplement_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('log_date', getTodayDate());

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
    async (userSupplementId: string, taken: boolean) => {
      if (!user) return;

      const existing = todaysLogs.find(
        (l) => l.user_supplement_id === userSupplementId,
      );

      if (existing) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
        const { error } = await (supabase.from('supplement_logs') as any)
          .update({
            taken,
            taken_at: taken ? new Date().toISOString() : null,
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
        const { error } = await (supabase.from('supplement_logs') as any).insert({
          user_id: user.id,
          user_supplement_id: userSupplementId,
          log_date: getTodayDate(),
          taken,
          taken_at: taken ? new Date().toISOString() : null,
          notes: null,
        });
        if (error) throw error;
      }

      await fetchTodaysLogs();
    },
    [user, todaysLogs, fetchTodaysLogs],
  );

  return {
    supplements,
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
