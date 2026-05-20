/**
 * save-queue.ts — offline-first write queue, localStorage-backed.
 *
 * Restored from the May 7 production bundle (module 734).
 *
 * Constants (verified from bundle):
 *  - localStorage key:      'healthy-me-save-queue-v1'
 *  - MAX_RETRIES:           12
 *  - BASE_BACKOFF_MS:       1500
 *  - MAX_BACKOFF_MS:        300_000  (5 min)
 *  - QUEUE_CAP:             500      (drops oldest failed, then oldest pending)
 *
 * Lifecycle:
 *  - On import: drain() once.
 *  - Re-drains on `window.online`.
 *  - Re-drains every 30s via setInterval.
 *  - On `beforeunload`: blocks unload if any non-failed ops are pending.
 */

import { supabase } from './supabase';

export type Operation = 'upsert' | 'insert' | 'update' | 'delete';
export type Status = 'pending' | 'syncing' | 'failed';

export interface QueueItem {
  id: string;
  operation: Operation;
  table: string;
  payload: Record<string, unknown>;
  onConflict?: string;
  whereClause?: Record<string, unknown>;
  retries: number;
  nextAttempt: number;
  status: Status;
  createdAt: number;
  label?: string;
  dedupeKey?: string;
}

const STORAGE_KEY = 'healthy-me-save-queue-v1';
const MAX_RETRIES = 12;
const BASE_BACKOFF_MS = 1500;
const MAX_BACKOFF_MS = 5 * 60 * 1000;
const QUEUE_CAP = 500;

function load(): QueueItem[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueueItem[]) : [];
  } catch {
    return [];
  }
}

function save(items: QueueItem[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('save-queue: localStorage full', e);
  }
}

const subscribers = new Set<(items: QueueItem[]) => void>();

function notify(): void {
  const items = load();
  subscribers.forEach((fn) => {
    try {
      fn(items);
    } catch (e) {
      console.error('save-queue: subscriber threw', e);
    }
  });
}

export function subscribe(fn: (items: QueueItem[]) => void): () => void {
  subscribers.add(fn);
  fn(load());
  return () => {
    subscribers.delete(fn);
  };
}

export function getPendingCount(): number {
  return load().filter((i) => i.status !== 'syncing').length;
}

export function getFailedOps(): QueueItem[] {
  return load().filter((i) => i.status === 'failed');
}

export function retryAllFailed(): void {
  const items = load();
  let touched = false;
  for (const it of items) {
    if (it.status === 'failed') {
      it.status = 'pending';
      it.retries = 0;
      it.nextAttempt = Date.now();
      touched = true;
    }
  }
  if (touched) {
    save(items);
    notify();
    void drain();
  }
}

export function enqueue(
  operation: Operation,
  table: string,
  payload: Record<string, unknown>,
  opts: {
    onConflict?: string;
    whereClause?: Record<string, unknown>;
    label?: string;
    dedupeKey?: string;
  } = {}
): string {
  const item: QueueItem = {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    operation,
    table,
    payload,
    onConflict: opts.onConflict,
    whereClause: opts.whereClause,
    retries: 0,
    nextAttempt: Date.now(),
    status: 'pending',
    createdAt: Date.now(),
    label: opts.label,
    dedupeKey: opts.dedupeKey,
  };

  let items = load();

  // Deduplicate by dedupeKey (preserves "syncing" entries).
  if (opts.dedupeKey) {
    items = items.filter(
      (e) => e.dedupeKey !== opts.dedupeKey || e.status === 'syncing'
    );
  }

  // Cap enforcement — drop oldest failed first, then oldest pending.
  if (items.length >= QUEUE_CAP) {
    const failedSorted = items
      .filter((e) => e.status === 'failed')
      .sort((a, b) => a.createdAt - b.createdAt);
    const overage = items.length - QUEUE_CAP + 1;
    if (failedSorted.length >= overage) {
      const dropIds = new Set(failedSorted.slice(0, overage).map((e) => e.id));
      items = items.filter((e) => !dropIds.has(e.id));
    } else {
      const dropFailedIds = new Set(failedSorted.map((e) => e.id));
      items = items.filter((e) => !dropFailedIds.has(e.id));
      const remaining = overage - failedSorted.length;
      const pendingSorted = [...items].sort((a, b) => a.createdAt - b.createdAt);
      const dropPendingIds = new Set(
        pendingSorted.slice(0, remaining).map((e) => e.id)
      );
      console.error(
        `[save-queue] queue at cap (${QUEUE_CAP}), dropping ${remaining} oldest pending ops`
      );
      items = items.filter((e) => !dropPendingIds.has(e.id));
    }
  }

  items.push(item);
  save(items);
  notify();
  void drain();
  return item.id;
}

export function enqueueUpsert(
  table: string,
  payload: Record<string, unknown>,
  onConflict: string,
  opts: { label?: string; dedupeKey?: string } = {}
): string {
  return enqueue('upsert', table, payload, { onConflict, ...opts });
}

export function enqueueDelete(
  table: string,
  whereClause: Record<string, unknown>,
  opts: { label?: string; dedupeKey?: string } = {}
): string {
  return enqueue('delete', table, {}, { whereClause, ...opts });
}

let draining = false;

export async function drain(): Promise<void> {
  if (draining) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  draining = true;
  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const items = load();
      const now = Date.now();
      const next = items.find(
        (i) => i.status === 'pending' && i.nextAttempt <= now
      );
      if (!next) break;
      next.status = 'syncing';
      save(items);
      notify();
      try {
        await execute(next);
        save(load().filter((i) => i.id !== next.id));
        notify();
      } catch (e) {
        console.error(
          `[save-queue] ${next.table} ${next.operation} failed (retry ${
            next.retries + 1
          }):`,
          e
        );
        const fresh = load();
        const found = fresh.find((i) => i.id === next.id);
        if (found) {
          found.retries += 1;
          if (found.retries >= MAX_RETRIES) {
            found.status = 'failed';
          } else {
            found.status = 'pending';
            const backoff = Math.min(
              BASE_BACKOFF_MS * Math.pow(2, found.retries),
              MAX_BACKOFF_MS
            );
            found.nextAttempt = Date.now() + backoff;
          }
          save(fresh);
          notify();
        }
      }
    }
  } finally {
    draining = false;
  }
}

async function execute(it: QueueItem): Promise<void> {
  const q = supabase.from(it.table);
  if (it.operation === 'upsert') {
    const { error } = await q.upsert(
      it.payload,
      it.onConflict ? { onConflict: it.onConflict } : undefined
    );
    if (error) throw error;
    return;
  }
  if (it.operation === 'insert') {
    const { error } = await q.insert(it.payload);
    if (error) throw error;
    return;
  }
  if (it.operation === 'update') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase builder chain
    let b: any = q.update(it.payload);
    if (it.whereClause)
      for (const [k, v] of Object.entries(it.whereClause)) b = b.eq(k, v);
    const { error } = await b;
    if (error) throw error;
    return;
  }
  if (it.operation === 'delete') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase builder chain
    let b: any = q.delete();
    if (it.whereClause)
      for (const [k, v] of Object.entries(it.whereClause)) b = b.eq(k, v);
    const { error } = await b;
    if (error) throw error;
    return;
  }
  throw new Error(`Unknown operation: ${it.operation}`);
}

// Lifecycle (web only)
if (typeof window !== 'undefined') {
  void drain();
  window.addEventListener('online', () => {
    void drain();
  });
  setInterval(() => {
    void drain();
  }, 30_000);
  window.addEventListener('beforeunload', (e) => {
    const remaining = load().filter((i) => i.status !== 'failed').length;
    if (remaining > 0) {
      e.preventDefault();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- beforeunload
      (e as any).returnValue = '';
    }
  });
}
