import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

/**
 * Like useFocusEffect, but skips the callback if less than `minIntervalMs`
 * has elapsed since the last invocation. Prevents re-fetching all data
 * on rapid tab switches.
 *
 * Default interval: 30 seconds.
 */
export function useDebouncedFocusEffect(
  callback: () => void,
  deps: React.DependencyList,
  minIntervalMs = 30_000,
) {
  const lastRunRef = useRef(0);

  useFocusEffect(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useCallback(() => {
      const now = Date.now();
      if (now - lastRunRef.current >= minIntervalMs) {
        lastRunRef.current = now;
        callback();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps),
  );
}
