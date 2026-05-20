/**
 * SaveStatusBadge — floating offline-sync indicator
 *
 * Restored from the May 7 production bundle (module 732).
 *
 * Renders bottom-center, above the tab bar (`bottom: 80`), only when there are
 * pending, syncing, or failed save-queue entries.
 *
 * Three states, in priority order:
 *  - failed > 0   → red "⚠ N save(s) failed — tap to retry" (calls retryFailed)
 *  - syncing > 0  → lavender "↻ Syncing (n)…" (n = pending + syncing)
 *  - pending > 0  → pink   "⏳ N waiting to sync"
 *  - otherwise    → renders null
 *
 * Mounted in `src/app/(tabs)/_layout.tsx` above `<Tabs>` so it floats over every tab.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  Colors,
  Fonts,
  FontSizes,
  Spacing,
  BorderRadius,
} from '../../constants/theme';
import { useSaveQueue } from '../../hooks/use-save-queue';

export function SaveStatusBadge() {
  const { pendingCount, syncingCount, failedCount, retryFailed } =
    useSaveQueue();

  if (failedCount === 0 && pendingCount === 0 && syncingCount === 0) {
    return null;
  }

  if (failedCount > 0) {
    return (
      <TouchableOpacity
        style={[styles.badge, styles.failed]}
        onPress={retryFailed}
        activeOpacity={0.7}
      >
        <Text style={styles.text}>
          {`⚠ ${failedCount} save${failedCount === 1 ? '' : 's'} failed — tap to retry`}
        </Text>
      </TouchableOpacity>
    );
  }

  if (syncingCount > 0) {
    return (
      <View style={[styles.badge, styles.syncing]}>
        <Text style={styles.text}>
          {`↻ Syncing${pendingCount > 0 ? ` (${pendingCount + syncingCount})` : ''}…`}
        </Text>
      </View>
    );
  }

  // pendingCount > 0
  return (
    <View style={[styles.badge, styles.pending]}>
      <Text style={styles.text}>{`⏳ ${pendingCount} waiting to sync`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  syncing: {
    backgroundColor: Colors.lavender,
  },
  pending: {
    backgroundColor: '#FFE0E8',
  },
  failed: {
    backgroundColor: '#FFCDD2',
    borderWidth: 1,
    borderColor: '#C62828',
  },
  text: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
});
