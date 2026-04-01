import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { HealthLab } from '../types/database';
import { getAllTests, computeLabStatus, LAB_CATEGORIES, CATEGORY_ORDER } from '../constants/lab-categories';
import type { LabTestDef } from '../constants/lab-categories';

/** Re-export flat test list for backward compat */
export const COMMON_LAB_TESTS = getAllTests().map((t) => ({
  name: t.name,
  unit: t.unit,
  refLow: t.refLow,
  refHigh: t.refHigh,
  category: LAB_CATEGORIES[t.category]?.label ?? t.category,
}));

export interface AddLabInput {
  testName: string;
  value: number;
  unit: string;
  testDate: string;
  refLow?: number | null;
  refHigh?: number | null;
  notes?: string;
  category?: string;
  provider?: string;
}

export function useLabs() {
  const { user } = useAuth();
  const [labs, setLabs] = useState<HealthLab[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLabs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('health_labs')
        .select('*')
        .eq('user_id', user.id)
        .order('test_date', { ascending: false });

      if (error) throw error;
      setLabs((data as HealthLab[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLabs();
  }, [fetchLabs]);

  const addLab = useCallback(
    async (input: AddLabInput) => {
      if (!user) return;

      const isFlagged =
        (input.refLow != null && input.value < input.refLow) ||
        (input.refHigh != null && input.value > input.refHigh);

      const status = computeLabStatus(input.value, input.refLow ?? null, input.refHigh ?? null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('health_labs') as any).insert({
        user_id: user.id,
        test_name: input.testName,
        value: input.value,
        unit: input.unit,
        test_date: input.testDate,
        reference_range_low: input.refLow ?? null,
        reference_range_high: input.refHigh ?? null,
        is_flagged: isFlagged,
        notes: input.notes ?? null,
        category: input.category ?? 'general',
        status,
        provider: input.provider ?? null,
      });

      if (error) throw error;
      await fetchLabs();
    },
    [user, fetchLabs],
  );

  const addLabsBatch = useCallback(
    async (inputs: AddLabInput[]) => {
      if (!user || inputs.length === 0) return;

      const rows = inputs.map((input) => ({
        user_id: user.id,
        test_name: input.testName,
        value: input.value,
        unit: input.unit,
        test_date: input.testDate,
        reference_range_low: input.refLow ?? null,
        reference_range_high: input.refHigh ?? null,
        is_flagged:
          (input.refLow != null && input.value < input.refLow) ||
          (input.refHigh != null && input.value > input.refHigh),
        notes: input.notes ?? null,
        category: input.category ?? 'general',
        status: computeLabStatus(input.value, input.refLow ?? null, input.refHigh ?? null),
        provider: input.provider ?? null,
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('health_labs') as any).insert(rows);
      if (error) throw error;
      await fetchLabs();
    },
    [user, fetchLabs],
  );

  const deleteLab = useCallback(
    async (labId: string) => {
      if (!user) return;
      const { error } = await supabase
        .from('health_labs')
        .delete()
        .eq('id', labId)
        .eq('user_id', user.id);
      if (!error) await fetchLabs();
    },
    [user, fetchLabs],
  );

  /** Get all results for a specific test name, sorted by date */
  const getTestHistory = useCallback(
    (testName: string): HealthLab[] => {
      return labs
        .filter((l) => l.test_name === testName)
        .sort((a, b) => a.test_date.localeCompare(b.test_date));
    },
    [labs],
  );

  /** Get unique test names */
  const testNames = useMemo(() => [...new Set(labs.map((l) => l.test_name))].sort(), [labs]);

  /** Get flagged results */
  const flaggedLabs = useMemo(() => labs.filter((l) => l.is_flagged), [labs]);

  /** Get most recent result per test */
  const latestByTest = useMemo(
    () =>
      testNames.map((name) => {
        const history = labs
          .filter((l) => l.test_name === name)
          .sort((a, b) => a.test_date.localeCompare(b.test_date));
        return history[history.length - 1];
      }),
    [testNames, labs],
  );

  /** Group latest results by category */
  const labsByCategory = useMemo(() => {
    const grouped: Record<string, HealthLab[]> = {};
    for (const lab of latestByTest) {
      const cat = lab.category || 'general';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(lab);
    }
    return grouped;
  }, [latestByTest]);

  /** Get previous result for a test (second-most-recent) */
  const getPreviousResult = useCallback(
    (testName: string): HealthLab | null => {
      const history = labs
        .filter((l) => l.test_name === testName)
        .sort((a, b) => a.test_date.localeCompare(b.test_date));
      return history.length >= 2 ? history[history.length - 2] : null;
    },
    [labs],
  );

  return {
    labs,
    loading,
    addLab,
    addLabsBatch,
    deleteLab,
    getTestHistory,
    testNames,
    flaggedLabs,
    latestByTest,
    labsByCategory,
    getPreviousResult,
    refetch: fetchLabs,
  };
}
