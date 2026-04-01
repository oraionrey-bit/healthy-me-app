import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { UserProfile, HealthCondition } from '../types/database';

const DEFAULT_CALORIE_TARGET = 1800;
const DEFAULT_PROTEIN_TARGET = 50;

interface UseUserProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  calorieTarget: number;
  proteinTarget: number;
  healthCondition: HealthCondition;
  isPcos: boolean;
  isOnboarded: boolean;
  refetch: () => Promise<void>;
}

export function useUserProfile(): UseUserProfileReturn {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.warn('Failed to fetch profile:', error.message);
        setProfile(null);
      } else {
        setProfile(data as UserProfile);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      if (!user) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
      const { error } = await (supabase.from('user_profiles') as any)
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      // Optimistic update
      setProfile((prev) => (prev ? { ...prev, ...updates } : prev));
    },
    [user],
  );

  const healthCondition: HealthCondition = profile?.health_condition ?? 'general';

  return {
    profile,
    loading,
    updateProfile,
    calorieTarget: profile?.calorie_target ?? DEFAULT_CALORIE_TARGET,
    proteinTarget: profile?.protein_target ?? DEFAULT_PROTEIN_TARGET,
    healthCondition,
    isPcos: healthCondition === 'pcos',
    isOnboarded: profile?.onboarding_complete ?? false,
    refetch: fetchProfile,
  };
}
