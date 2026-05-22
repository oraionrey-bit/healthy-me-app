/**
 * useSaveQueue — React hook around the save-queue subscriber.
 *
 * Restored from the May 7 production bundle (module 733).
 */

import { useEffect, useState } from 'react';
import { subscribe, retryAllFailed, type QueueItem } from '../lib/save-queue';

export function useSaveQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);

  useEffect(() => subscribe(setItems), []);

  return {
    pendingCount: items.filter((i) => i.status === 'pending').length,
    syncingCount: items.filter((i) => i.status === 'syncing').length,
    failedCount: items.filter((i) => i.status === 'failed').length,
    failedOps: items.filter((i) => i.status === 'failed'),
    retryFailed: retryAllFailed,
  };
}
