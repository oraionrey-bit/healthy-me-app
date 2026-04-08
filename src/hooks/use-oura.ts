import { useState, useEffect, useCallback } from 'react';
import { Platform, Linking } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { toDateKey } from '../utils/storage';
import type { OuraDaily } from '../types/database';

const SUPABASE_FUNCTIONS_URL =
  'https://xkdagrpbgyjsbnzbpkxb.supabase.co/functions/v1';

/** Returns the best available step count and whether it's an estimate */
export function getBestSteps(data: OuraDaily | null): { steps: number | null; isEstimated: boolean } {
  if (!data) return { steps: null, isEstimated: false };
  // Always use raw steps from Oura API — equivalent_walking_distance factors in intensity
  // and can't be reliably converted to step count. Steps update with each sync.
  return { steps: data.steps, isEstimated: false };
}

interface UseOuraReturn {
  isConnected: boolean;
  loading: boolean;
  todayData: OuraDaily | null;
  recentData: OuraDaily[];
  activityFromYesterday: boolean;
  activityIsLive: boolean;
  connectOura: () => Promise<void>;
  disconnectOura: () => Promise<void>;
  syncOura: (startDate?: string, endDate?: string) => Promise<void>;
  syncing: boolean;
}

export function useOura(): UseOuraReturn {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [todayData, setTodayData] = useState<OuraDaily | null>(null);
  const [recentData, setRecentData] = useState<OuraDaily[]>([]);
  const [syncing, setSyncing] = useState(false);

  // Check connection status from user_profiles
  const fetchConnectionStatus = useCallback(async () => {
    if (!user) {
      setIsConnected(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.warn('Failed to check Oura status:', error.message);
        setIsConnected(false);
      } else {
        setIsConnected(!!(data as { oura_connected?: boolean })?.oura_connected);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch today's Oura data
  const [activityFromYesterday, setActivityFromYesterday] = useState(false);
  const [activityIsLive, setActivityIsLive] = useState(false);

  const fetchTodayData = useCallback(async () => {
    if (!user) return;

    const today = toDateKey(new Date());
    const { data, error } = await supabase
      .from('oura_daily')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', today)
      .maybeSingle();

    if (!error && data) {
      const ouraData = data as OuraDaily;
      // Check if today has ANY activity data (steps, active_calories, or total_calories)
      const hasAnyActivityToday =
        ouraData.steps != null ||
        ouraData.active_calories != null ||
        ouraData.total_calories != null;

      if (hasAnyActivityToday) {
        // Today has live/partial activity data — use it even without a score
        setActivityFromYesterday(false);
        setActivityIsLive(ouraData.activity_score == null);
      } else {
        // No activity data at all today — fall back to yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const { data: ydayData } = await supabase
          .from('oura_daily')
          .select('*')
          .eq('user_id', user.id)
          .eq('log_date', toDateKey(yesterday))
          .maybeSingle();

        if (ydayData) {
          const yday = ydayData as OuraDaily;
          // Only fill activity fields from yesterday, keep today's sleep/readiness
          ouraData.activity_score = yday.activity_score;
          ouraData.steps = yday.steps;
          ouraData.active_calories = yday.active_calories;
          ouraData.total_calories = yday.total_calories;
          ouraData.low_activity_minutes = yday.low_activity_minutes;
          ouraData.medium_activity_minutes = yday.medium_activity_minutes;
          ouraData.high_activity_minutes = yday.high_activity_minutes;
          setActivityFromYesterday(true);
        }
        setActivityIsLive(false);
      }
      setTodayData(ouraData);
    }
  }, [user]);

  // Fetch recent data (last 90 days for trends)
  const fetchRecentData = useCallback(async () => {
    if (!user) return;

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 90);

    const { data, error } = await supabase
      .from('oura_daily')
      .select('*')
      .eq('user_id', user.id)
      .gte('log_date', toDateKey(start))
      .lte('log_date', toDateKey(end))
      .order('log_date', { ascending: true });

    if (!error && data) {
      setRecentData(data as OuraDaily[]);
    }
  }, [user]);

  useEffect(() => {
    fetchConnectionStatus();
  }, [fetchConnectionStatus]);

  // Sync first on mount, then fetch from DB for fresh data
  useEffect(() => {
    if (isConnected) {
      const today = toDateKey(new Date());
      // Trigger a sync first, then read from DB
      syncOura(today, today)
        .catch(() => {/* ignore sync errors, still read from DB */})
        .finally(() => {
          fetchTodayData();
          fetchRecentData();
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  // Initiate OAuth flow
  const connectOura = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch(
        `${SUPABASE_FUNCTIONS_URL}/oura-auth?user_id=${user.id}`,
      );
      const result = await response.json();

      if (result.url) {
        if (Platform.OS === 'web') {
          window.open(result.url, '_blank');
        } else {
          await Linking.openURL(result.url);
        }
      }
    } catch (err) {
      console.error('Failed to initiate Oura auth:', err);
    }
  }, [user]);

  // Disconnect Oura
  const disconnectOura = useCallback(async () => {
    if (!user) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
    const { error } = await (supabase.from('user_profiles') as any)
      .update({
        oura_access_token: null,
        oura_refresh_token: null,
        oura_connected: false,
      })
      .eq('id', user.id);

    if (!error) {
      setIsConnected(false);
      setTodayData(null);
      setRecentData([]);
    }
  }, [user]);

  // Trigger manual sync
  const syncOura = useCallback(
    async (startDate?: string, endDate?: string) => {
      if (!user) return;
      setSyncing(true);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/oura-sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token ?? ''}`,
          },
          body: JSON.stringify({
            user_id: user.id,
            start_date: startDate,
            end_date: endDate,
          }),
        });

        const result = await response.json();
        if (result.success) {
          // Refresh local data
          await Promise.all([fetchTodayData(), fetchRecentData()]);
        } else {
          console.warn('Oura sync failed:', result.error);
        }
      } catch (err) {
        console.error('Oura sync error:', err);
      } finally {
        setSyncing(false);
      }
    },
    [user, fetchTodayData, fetchRecentData],
  );

  return {
    isConnected,
    loading,
    todayData,
    recentData,
    activityFromYesterday,
    activityIsLive,
    connectOura,
    disconnectOura,
    syncOura,
    syncing,
  };
}
