import { toDateKey } from '../utils/storage';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

// ── Types ──────────────────────────────────────────────────────────────

export type ProductStatus = 'safe' | 'trigger' | 'testing';
export type RoutineTime = 'am' | 'pm' | 'both';

export type ReactionRating = 'good' | 'neutral' | 'bad';

export interface ProductUsageEntry {
  date: string;
  rating: ReactionRating;
  note?: string;
}

export interface SkincareProduct {
  id: string;
  name: string;
  status: ProductStatus;
  notes?: string;
  brand?: string;
  ingredients?: string[];
  product_type?: string;
  testingStartDate?: string;
  usageLog?: ProductUsageEntry[];
}

export interface RoutineStep {
  id: string;
  productId?: string;      // FK to SkincareProduct.id
  productName: string;
  sortOrder: number;
  time: RoutineTime;
}

export interface RoutineCheckState {
  [stepId: string]: boolean;
}

export interface SkinJournalEntry {
  id: string;
  date: string;
  notes: string;
  severity: number; // 1-5
  triggers: string[];
  productReactions: { product: string; reaction: string }[];
  createdAt: string;
}

export interface UpNextItem {
  id: string;
  text: string;
  done: boolean;
}

export interface RoutineInsights {
  amAdherence: number;    // 0-100 percentage over last 7 days
  pmAdherence: number;    // 0-100 percentage over last 7 days
  streak: number;         // consecutive days both routines completed
  mostSkippedStep: string | null;
}

export interface TesterSummary {
  productId: string;
  productName: string;
  dayCount: number;
  last7Days: Array<'good' | 'neutral' | 'bad' | 'none'>;
  goodPercent: number;
  badPercent: number;
  totalLogs: number;
  suggestion: 'consider-safe' | 'consider-trigger' | null;
}

export interface SkinData {
  products: SkincareProduct[];
  routineSteps: RoutineStep[];
  routineChecks: Record<string, RoutineCheckState>; // keyed by date
  journal: SkinJournalEntry[];
  upNext: UpNextItem[];
}

// ── Defaults ───────────────────────────────────────────────────────────

const DEFAULT_PRODUCTS: SkincareProduct[] = [
  // Safe products
  { id: 'p1', name: 'Laneige Cream Skin', status: 'safe' },
  { id: 'p2', name: 'Wellage HA Blue Ampoule', status: 'safe' },
  { id: 'p3', name: 'Aestura Atobarrier 365', status: 'safe' },
  { id: 'p4', name: 'Goodal Heartleaf SPF', status: 'safe' },
  { id: 'p5', name: 'Celimax Noni Ampoule', status: 'safe' },
  { id: 'p6', name: 'COSRX Propolis Lip Mask', status: 'safe' },
  { id: 'p12', name: 'S-Nature Aqua Squalane', status: 'safe', notes: 'Lightweight oil, good for dry patches' },
  { id: 'p13', name: 'Caudalie Vinoperfect Serum', status: 'safe', notes: 'Brightening, no irritation' },
  { id: 'p14', name: 'LRP Anthelios UVMune 400', status: 'safe', notes: 'Europe SPF, high UVA protection' },
  { id: 'p15', name: 'Acnon Spot Treatment', status: 'safe', notes: 'For active spots only' },
  // Testing
  { id: 'p7', name: 'Madeca Cream', status: 'testing', notes: 'Testing as moisturizer replacement', testingStartDate: '2026-03-26' },
  // Triggers
  { id: 'p8', name: 'Niacinamide (high %)', status: 'trigger', notes: 'High % confirmed trigger (Biodance 20%). Low % unknown' },
  { id: 'p9', name: 'Snail Mucin', status: 'trigger', notes: 'COSRX caused breakout' },
  { id: 'p10', name: 'Laneige Lip Sleeping Mask', status: 'trigger', notes: 'Wax/oils migrate above lips causing perioral bumps' },
  { id: 'p11', name: 'Vea Lipogel', status: 'trigger', notes: 'Vitamin E breaks out perioral area — do NOT use near face' },
  { id: 'p16', name: 'Dr. Reju-All Cream', status: 'trigger', notes: 'Contains niacinamide' },
  { id: 'p17', name: 'Centellian 24 Madeca Cream (original)', status: 'trigger', notes: 'Niacinamide in some versions + comedone reports' },
  { id: 'p18', name: "Mary Ruth's Probiotics", status: 'trigger', notes: 'Contains histamine-producing strains L. casei, L. bulgaricus' },
];

const DEFAULT_ROUTINE: RoutineStep[] = [
  // AM: Cream Skin → HA → Squalane (if dry) → Atobarrier/Madeca → Goodal SPF (or LRP)
  { id: 'r1', productId: 'p1', productName: 'Laneige Cream Skin', sortOrder: 1, time: 'both' },
  { id: 'r2', productId: 'p2', productName: 'Wellage HA Blue Ampoule', sortOrder: 2, time: 'both' },
  { id: 'r8', productId: 'p12', productName: 'S-Nature Aqua Squalane (if dry)', sortOrder: 3, time: 'am' },
  { id: 'r4', productId: 'p3', productName: 'Aestura Atobarrier 365 OR Madeca Cream', sortOrder: 4, time: 'am' },
  { id: 'r6', productId: 'p4', productName: 'Goodal Heartleaf SPF (or LRP in summer)', sortOrder: 5, time: 'am' },
  // PM: Cream Skin → HA → Noni → Caudalie Vinoperfect → Aestura/Madeca → Propolis Lip
  { id: 'r3', productId: 'p5', productName: 'Celimax Noni Ampoule', sortOrder: 3, time: 'pm' },
  { id: 'r9', productId: 'p13', productName: 'Caudalie Vinoperfect Serum', sortOrder: 4, time: 'pm' },
  { id: 'r5', productId: 'p3', productName: 'Aestura Atobarrier 365 OR Madeca Cream', sortOrder: 5, time: 'pm' },
  { id: 'r7', productId: 'p6', productName: 'COSRX Propolis Lip Mask', sortOrder: 6, time: 'pm' },
];

const DEFAULT_UP_NEXT: UpNextItem[] = [
  { id: 'un1', text: 'Start azelaic acid (after skin reset stabilizes)', done: false },
  { id: 'un2', text: 'Transition from Aestura to Madeca Cream (testing)', done: false },
];

const DEFAULT_SKIN_DATA: SkinData = {
  products: DEFAULT_PRODUCTS,
  routineSteps: DEFAULT_ROUTINE,
  routineChecks: {},
  journal: [],
  upNext: DEFAULT_UP_NEXT,
};

// ── Hook ───────────────────────────────────────────────────────────────

export function useSkincare() {
  const { user } = useAuth();
  const [skinData, setSkinData] = useState<SkinData>(DEFAULT_SKIN_DATA);
  const [loading, setLoading] = useState(true);
  const seededRef = useRef(false);

  const today = toDateKey(new Date());

  // ── Fetch from daily_logs.health_notes ──

  const fetchSkinData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('daily_logs') as any)
        .select('health_notes')
        .eq('user_id', user.id)
        .eq('log_date', today)
        .maybeSingle();

      if (error) throw error;

      if (data?.health_notes) {
        try {
          const parsed = JSON.parse(data.health_notes as string);
          if (parsed?.skincare) {
            setSkinData(prev => ({
              ...DEFAULT_SKIN_DATA,
              ...parsed.skincare,
              // Merge products: keep defaults, overlay saved
              products: parsed.skincare.products ?? prev.products,
              routineSteps: parsed.skincare.routineSteps ?? prev.routineSteps,
            }));
            return;
          }
        } catch {
          // health_notes wasn't JSON or didn't have skincare
        }
      }

      // No saved data — use defaults but only seed once
      if (!seededRef.current) {
        seededRef.current = true;
        setSkinData(DEFAULT_SKIN_DATA);
      }
    } finally {
      setLoading(false);
    }
  }, [user, today]);

  useEffect(() => {
    fetchSkinData();
  }, [fetchSkinData]);

  // ── Persist to daily_logs.health_notes ──

  const persistSkinData = useCallback(
    async (newData: SkinData) => {
      if (!user) return;

      const payload = JSON.stringify({ skincare: newData });

      // Check if daily_log exists
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase.from('daily_logs') as any)
        .select('id, health_notes')
        .eq('user_id', user.id)
        .eq('log_date', today)
        .maybeSingle();

      if (existing) {
        // Merge with existing health_notes if they contain non-skincare data
        let merged = payload;
        if (existing.health_notes) {
          try {
            const existingParsed = JSON.parse(existing.health_notes as string);
            existingParsed.skincare = newData;
            merged = JSON.stringify(existingParsed);
          } catch {
            // Existing health_notes wasn't JSON — it's user's text notes
            // Preserve them as userNotes inside the skincare payload
            const parsed = JSON.parse(payload);
            parsed.userNotes = existing.health_notes;
            merged = JSON.stringify(parsed);
          }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('daily_logs') as any)
          .update({ health_notes: merged })
          .eq('id', existing.id);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('daily_logs') as any).insert({
          user_id: user.id,
          log_date: today,
          health_notes: payload,
        });
      }
    },
    [user, today],
  );

  // ── Routine checks ──

  const todayChecks = skinData.routineChecks[today] ?? {};

  const toggleRoutineStep = useCallback(
    async (stepId: string) => {
      const newChecks = {
        ...todayChecks,
        [stepId]: !todayChecks[stepId],
      };
      const newData: SkinData = {
        ...skinData,
        routineChecks: {
          ...skinData.routineChecks,
          [today]: newChecks,
        },
      };
      setSkinData(newData);
      await persistSkinData(newData);
    },
    [skinData, todayChecks, today, persistSkinData],
  );

  const isStepDone = useCallback(
    (stepId: string): boolean => {
      return !!todayChecks[stepId];
    },
    [todayChecks],
  );

  const amSteps = skinData.routineSteps
    .filter((s) => s.time === 'am' || s.time === 'both')
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const pmSteps = skinData.routineSteps
    .filter((s) => s.time === 'pm' || s.time === 'both')
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const amDoneCount = amSteps.filter((s) => isStepDone(`am-${s.id}`)).length;
  const pmDoneCount = pmSteps.filter((s) => isStepDone(`pm-${s.id}`)).length;

  // ── Journal ──

  const addJournalEntry = useCallback(
    async (entry: Omit<SkinJournalEntry, 'id' | 'createdAt'>) => {
      const newEntry: SkinJournalEntry = {
        ...entry,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };
      const newData: SkinData = {
        ...skinData,
        journal: [newEntry, ...skinData.journal],
      };
      setSkinData(newData);
      await persistSkinData(newData);
    },
    [skinData, persistSkinData],
  );

  // ── Products ──

  const addProduct = useCallback(
    async (name: string, status: ProductStatus, notes?: string) => {
      const newProduct: SkincareProduct = {
        id: `p-${Date.now()}`,
        name,
        status,
        notes,
      };
      const newData: SkinData = {
        ...skinData,
        products: [...skinData.products, newProduct],
      };
      setSkinData(newData);
      await persistSkinData(newData);
    },
    [skinData, persistSkinData],
  );

  const deleteProduct = useCallback(
    async (productId: string) => {
      const newData: SkinData = {
        ...skinData,
        products: skinData.products.filter(p => p.id !== productId),
        // Also remove from routine steps
        routineSteps: skinData.routineSteps.filter(s => s.productId !== productId),
      };
      setSkinData(newData);
      await persistSkinData(newData);
    },
    [skinData, persistSkinData],
  );

  const updateProductStatus = useCallback(
    async (productId: string, status: ProductStatus) => {
      const newData: SkinData = {
        ...skinData,
        products: skinData.products.map((p) =>
          p.id === productId
            ? {
                ...p,
                status,
                testingStartDate:
                  status === 'testing' && !p.testingStartDate
                    ? today
                    : status !== 'testing'
                      ? undefined
                      : p.testingStartDate,
              }
            : p,
        ),
      };
      setSkinData(newData);
      await persistSkinData(newData);
    },
    [skinData, today, persistSkinData],
  );

  const logProductUsage = useCallback(
    async (productId: string, rating: ReactionRating, note?: string) => {
      const entry: ProductUsageEntry = { date: today, rating, note };
      const newData: SkinData = {
        ...skinData,
        products: skinData.products.map((p) => {
          if (p.id !== productId) return p;
          const log = p.usageLog ?? [];
          // Replace any existing entry for today, otherwise append
          const existingIdx = log.findIndex((e) => e.date === today);
          const newLog =
            existingIdx >= 0
              ? log.map((e, i) => (i === existingIdx ? entry : e))
              : [...log, entry];
          return { ...p, usageLog: newLog };
        }),
      };
      setSkinData(newData);
      await persistSkinData(newData);
    },
    [skinData, today, persistSkinData],
  );

  const getProductUsageToday = useCallback(
    (productId: string): ProductUsageEntry | undefined => {
      const product = skinData.products.find((p) => p.id === productId);
      return product?.usageLog?.find((e) => e.date === today);
    },
    [skinData, today],
  );

  const getTestingDays = useCallback(
    (product: SkincareProduct): number => {
      if (product.status !== 'testing' || !product.testingStartDate) return 0;
      const start = new Date(product.testingStartDate);
      const now = new Date(today);
      return Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86_400_000) + 1);
    },
    [today],
  );

  // ── Routine Management ──

  const addRoutineStep = useCallback(
    async (productId: string, time: RoutineTime) => {
      const product = skinData.products.find(p => p.id === productId);
      if (!product) return;

      const maxOrder = skinData.routineSteps.reduce((max, s) => Math.max(max, s.sortOrder), 0);
      const newStep: RoutineStep = {
        id: `r-${Date.now()}`,
        productId,
        productName: product.name,
        sortOrder: maxOrder + 1,
        time,
      };
      const newData: SkinData = {
        ...skinData,
        routineSteps: [...skinData.routineSteps, newStep],
      };
      setSkinData(newData);
      await persistSkinData(newData);
    },
    [skinData, persistSkinData],
  );

  const removeRoutineStep = useCallback(
    async (stepId: string) => {
      const newSteps = skinData.routineSteps.filter(s => s.id !== stepId);
      // Recompute sortOrder
      const sorted = newSteps.sort((a, b) => a.sortOrder - b.sortOrder).map((s, i) => ({ ...s, sortOrder: i + 1 }));
      const newData: SkinData = {
        ...skinData,
        routineSteps: sorted,
      };
      setSkinData(newData);
      await persistSkinData(newData);
    },
    [skinData, persistSkinData],
  );

  const reorderRoutineStep = useCallback(
    async (stepId: string, direction: 'up' | 'down') => {
      const steps = [...skinData.routineSteps].sort((a, b) => a.sortOrder - b.sortOrder);
      const idx = steps.findIndex(s => s.id === stepId);
      if (idx < 0) return;

      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= steps.length) return;

      // Swap sortOrder values
      const tempOrder = steps[idx].sortOrder;
      steps[idx] = { ...steps[idx], sortOrder: steps[swapIdx].sortOrder };
      steps[swapIdx] = { ...steps[swapIdx], sortOrder: tempOrder };

      const newData: SkinData = { ...skinData, routineSteps: steps };
      setSkinData(newData);
      await persistSkinData(newData);
    },
    [skinData, persistSkinData],
  );

  const updateRoutineStepTime = useCallback(
    async (stepId: string, time: RoutineTime) => {
      const newData: SkinData = {
        ...skinData,
        routineSteps: skinData.routineSteps.map(s =>
          s.id === stepId ? { ...s, time } : s
        ),
      };
      setSkinData(newData);
      await persistSkinData(newData);
    },
    [skinData, persistSkinData],
  );

  // Derived: products available to add to a specific routine
  // Products can be in both AM and PM — only filter out if already in the target routine
  const getAvailableProductsForRoutine = useCallback(
    (targetTime: 'am' | 'pm') => {
      const stepsInTarget = skinData.routineSteps.filter(s =>
        s.time === targetTime || s.time === 'both'
      );
      const idsInTarget = new Set(stepsInTarget.map(s => s.productId).filter(Boolean));
      return skinData.products.filter(
        p => (p.status === 'safe' || p.status === 'testing') && !idsInTarget.has(p.id)
      );
    },
    [skinData],
  );
  // Keep backward-compatible export (shows all safe/testing products)
  const availableProductsForRoutine = skinData.products.filter(
    p => p.status === 'safe' || p.status === 'testing'
  );

  // ── Up Next ──

  const addUpNextItem = useCallback(
    async (text: string) => {
      const newItem: UpNextItem = { id: `un-${Date.now()}`, text, done: false };
      const newData: SkinData = {
        ...skinData,
        upNext: [...(skinData.upNext ?? []), newItem],
      };
      setSkinData(newData);
      await persistSkinData(newData);
    },
    [skinData, persistSkinData],
  );

  const toggleUpNextItem = useCallback(
    async (itemId: string) => {
      const newData: SkinData = {
        ...skinData,
        upNext: (skinData.upNext ?? []).map((item) =>
          item.id === itemId ? { ...item, done: !item.done } : item,
        ),
      };
      setSkinData(newData);
      await persistSkinData(newData);
    },
    [skinData, persistSkinData],
  );

  const removeUpNextItem = useCallback(
    async (itemId: string) => {
      const newData: SkinData = {
        ...skinData,
        upNext: (skinData.upNext ?? []).filter((item) => item.id !== itemId),
      };
      setSkinData(newData);
      await persistSkinData(newData);
    },
    [skinData, persistSkinData],
  );

  // Derived data
  const safeProducts = skinData.products.filter((p) => p.status === 'safe');
  const triggerProducts = skinData.products.filter((p) => p.status === 'trigger');
  const testingProducts = skinData.products.filter((p) => p.status === 'testing');

  // ── Routine Insights (last 7 days) ──

  const routineInsights: RoutineInsights = (() => {
    const last7: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7.push(toDateKey(d));
    }

    const DONE_THRESHOLD = 0.8; // 80% of steps = "done" for the day

    let amDone = 0;
    let pmDone = 0;
    const stepSkipCounts: Record<string, number> = {};

    for (const dateKey of last7) {
      const checks = skinData.routineChecks[dateKey] ?? {};

      // AM adherence
      const amTotal = amSteps.length;
      const amChecked = amSteps.filter(s => checks[`am-${s.id}`]).length;
      if (amTotal > 0 && amChecked / amTotal >= DONE_THRESHOLD) amDone++;

      // PM adherence
      const pmTotal = pmSteps.length;
      const pmChecked = pmSteps.filter(s => checks[`pm-${s.id}`]).length;
      if (pmTotal > 0 && pmChecked / pmTotal >= DONE_THRESHOLD) pmDone++;

      // Track skipped steps
      for (const step of amSteps) {
        if (!checks[`am-${step.id}`]) {
          const key = step.productName;
          stepSkipCounts[key] = (stepSkipCounts[key] ?? 0) + 1;
        }
      }
      for (const step of pmSteps) {
        if (!checks[`pm-${step.id}`]) {
          const key = step.productName;
          stepSkipCounts[key] = (stepSkipCounts[key] ?? 0) + 1;
        }
      }
    }

    // Streak: walk backwards counting consecutive days where both are done
    let streak = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = toDateKey(d);
      const checks = skinData.routineChecks[dateKey] ?? {};

      const amTotal = amSteps.length;
      const amChecked = amSteps.filter(s => checks[`am-${s.id}`]).length;
      const pmTotal = pmSteps.length;
      const pmChecked = pmSteps.filter(s => checks[`pm-${s.id}`]).length;

      const amOk = amTotal > 0 && amChecked / amTotal >= DONE_THRESHOLD;
      const pmOk = pmTotal > 0 && pmChecked / pmTotal >= DONE_THRESHOLD;

      if (amOk && pmOk) {
        streak++;
      } else {
        break;
      }
    }

    // Most skipped step
    let mostSkipped: string | null = null;
    let maxSkips = 0;
    for (const [name, count] of Object.entries(stepSkipCounts)) {
      if (count > maxSkips) {
        maxSkips = count;
        mostSkipped = name;
      }
    }

    return {
      amAdherence: Math.round((amDone / 7) * 100),
      pmAdherence: Math.round((pmDone / 7) * 100),
      streak,
      mostSkippedStep: mostSkipped,
    };
  })();

  // ── Tester Summaries ──

  const testerSummaries: TesterSummary[] = testingProducts
    .map((product) => {
      const dayCount = getTestingDays(product);
      const log = product.usageLog ?? [];

      // Last 7 days of reactions
      const last7Days: Array<'good' | 'neutral' | 'bad' | 'none'> = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateKey = toDateKey(d);
        const entry = log.find(e => e.date === dateKey);
        last7Days.push(entry?.rating ?? 'none');
      }

      // Overall ratios
      const totalLogs = log.length;
      const goodCount = log.filter(e => e.rating === 'good').length;
      const badCount = log.filter(e => e.rating === 'bad').length;
      const goodPercent = totalLogs > 0 ? Math.round((goodCount / totalLogs) * 100) : 0;
      const badPercent = totalLogs > 0 ? Math.round((badCount / totalLogs) * 100) : 0;

      // Suggestions
      let suggestion: TesterSummary['suggestion'] = null;
      if (totalLogs >= 7 && goodPercent >= 70) {
        suggestion = 'consider-safe';
      } else if (totalLogs >= 5 && badPercent >= 50) {
        suggestion = 'consider-trigger';
      }

      return {
        productId: product.id,
        productName: product.name,
        dayCount,
        last7Days,
        goodPercent,
        badPercent,
        totalLogs,
        suggestion,
      };
    })
    .sort((a, b) => b.dayCount - a.dayCount); // longest testing first

  return {
    skinData,
    loading,
    // Routine
    amSteps,
    pmSteps,
    amDoneCount,
    pmDoneCount,
    toggleRoutineStep,
    isStepDone,
    addRoutineStep,
    removeRoutineStep,
    reorderRoutineStep,
    updateRoutineStepTime,
    availableProductsForRoutine,
    getAvailableProductsForRoutine,
    deleteProduct,
    routineSteps: skinData.routineSteps,
    // Journal
    journal: skinData.journal,
    addJournalEntry,
    // Products
    products: skinData.products,
    safeProducts,
    triggerProducts,
    testingProducts,
    addProduct,
    updateProductStatus,
    logProductUsage,
    getProductUsageToday,
    getTestingDays,
    // Up Next
    upNext: skinData.upNext ?? [],
    addUpNextItem,
    toggleUpNextItem,
    removeUpNextItem,
    // Analytics
    routineInsights,
    testerSummaries,
    // Refresh
    refetch: fetchSkinData,
  };
}
