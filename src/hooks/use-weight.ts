import { toDateKey } from '../utils/storage';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { WeightLog } from '../types/database';


export function useWeight() {
  const { user } = useAuth();
  const [lastWeight, setLastWeight] = useState<WeightLog | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLastWeight = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('weight_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('log_date', { ascending: false })
        .limit(1);

      if (error) throw error;
      setLastWeight(data && data.length > 0 ? (data[0] as WeightLog) : null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLastWeight();
  }, [fetchLastWeight]);

  const logWeight = useCallback(
    async (weight: number) => {
      if (!user) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
      const { error } = await (supabase.from('weight_logs') as any).insert({
        user_id: user.id,
        log_date: toDateKey(new Date()),
        weight,
        notes: null,
      });
      if (error) throw error;
      await fetchLastWeight();
    },
    [user, fetchLastWeight],
  );

  return { lastWeight, loading, logWeight, refetch: fetchLastWeight };
}
