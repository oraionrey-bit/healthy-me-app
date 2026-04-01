import { toDateKey } from '../utils/storage';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

// ── Types ──────────────────────────────────────────────────────────────

export type ProductStatus = 'safe' | 'trigger' | 'testing';
export type RoutineTime = 'am' | 'pm' | 'both';

export interface SkincareProduct {
  id: string;
  name: string;
  status: ProductStatus;
  notes?: string;
}

export interface RoutineStep {
  id: string;
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
  { id: 'p7', name: 'Madeca Cream', status: 'testing', notes: 'Testing as moisturizer replacement' },
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
  { id: 'r1', productName: 'Laneige Cream Skin', sortOrder: 1, time: 'both' },
  { id: 'r2', productName: 'Wellage HA Blue Ampoule', sortOrder: 2, time: 'both' },
  { id: 'r8', productName: 'S-Nature Aqua Squalane (if dry)', sortOrder: 3, time: 'am' },
  { id: 'r4', productName: 'Aestura Atobarrier 365 OR Madeca Cream', sortOrder: 4, time: 'am' },
  { id: 'r6', productName: 'Goodal Heartleaf SPF (or LRP in summer)', sortOrder: 5, time: 'am' },
  // PM: Cream Skin → HA → Noni → Caudalie Vinoperfect → Aestura/Madeca → Propolis Lip
  { id: 'r3', productName: 'Celimax Noni Ampoule', sortOrder: 3, time: 'pm' },
  { id: 'r9', productName: 'Caudalie Vinoperfect Serum', sortOrder: 4, time: 'pm' },
  { id: 'r5', productName: 'Aestura Atobarrier 365 OR Madeca Cream', sortOrder: 5, time: 'pm' },
  { id: 'r7', productName: 'COSRX Propolis Lip Mask', sortOrder: 6, time: 'pm' },
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
            merged = payload;
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

  const updateProductStatus = useCallback(
    async (productId: string, status: ProductStatus) => {
      const newData: SkinData = {
        ...skinData,
        products: skinData.products.map((p) =>
          p.id === productId ? { ...p, status } : p,
        ),
      };
      setSkinData(newData);
      await persistSkinData(newData);
    },
    [skinData, persistSkinData],
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
    // Up Next
    upNext: skinData.upNext ?? [],
    addUpNextItem,
    toggleUpNextItem,
    removeUpNextItem,
    // Refresh
    refetch: fetchSkinData,
  };
}
