import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { compressImage } from '../utils/compress-image';
import type { FoodLog } from '../types/database';

const POLL_INTERVAL_MS = 30_000;
const FOOD_PHOTO_URL_TTL_SECONDS = 60 * 60 * 24 * 365;

interface AddFoodInput {
  meal_type: FoodLog['meal_type'];
  description: string;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  meal_time?: string | null;
  photos?: File[];
  leftovers_photos?: File[];
}

/**
 * Trigger AI analysis of a food log entry via the analyze-food Edge Function.
 * Fire-and-forget — doesn't block the UI.
 */
async function triggerAnalysis(foodLogId: string, mode?: 'leftovers', leftoversPhotoUrl?: string, retryCount = 0): Promise<void> {
  try {
    let { data: sessionData } = await supabase.auth.getSession();
    let token = sessionData?.session?.access_token;

    // If token is missing/expired, try refreshing the session before giving up
    if (!token) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      token = refreshed?.session?.access_token;
      if (!token) {
        console.warn('triggerAnalysis: no valid session after refresh, skipping');
        return;
      }
    }

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
    const body: Record<string, unknown> = { food_log_id: foodLogId };
    if (mode === 'leftovers' && leftoversPhotoUrl) {
      body.mode = 'leftovers';
      body.leftovers_photo_url = leftoversPhotoUrl;
    }
    const response = await fetch(`${supabaseUrl}/functions/v1/analyze-food`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
      },
      body: JSON.stringify(body),
    });

    // Retry on 5xx errors (worker limit, etc.) — up to 3 times with backoff
    if (!response.ok && response.status >= 500 && retryCount < 3) {
      const delay = (retryCount + 1) * 10000; // 10s, 20s, 30s
      setTimeout(() => triggerAnalysis(foodLogId, mode, leftoversPhotoUrl, retryCount + 1), delay);
    }
  } catch (err) {
    // Network error — retry once after 15s
    if (retryCount < 2) {
      setTimeout(() => triggerAnalysis(foodLogId, mode, leftoversPhotoUrl, retryCount + 1), 15000);
    }
    console.error('Failed to trigger food analysis:', err);
  }
}

export function useFoodLog(date: string) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchEntries = useCallback(async (showLoading = true) => {
    if (!user) return;
    if (showLoading) setLoading(true);
    const { data, error } = await supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', date)
      .order('created_at', { ascending: true });

    if (!error && data) setEntries(data as FoodLog[]);
    setLoading(false);
  }, [user, date]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Re-fetch when tab gains focus (e.g. switching from Food → Home)
  // Silent refetch — no loading spinner, just update data in background
  useFocusEffect(
    useCallback(() => {
      fetchEntries(false);
    }, [fetchEntries])
  );

  // Poll for AI analysis completion when any entry is pending
  const hasPending = entries.some((e) => !e.ai_analyzed);

  useEffect(() => {
    if (!hasPending) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    pollRef.current = setInterval(() => {
      fetchEntries();
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [hasPending, fetchEntries]);

  const uploadPhotos = async (files: File[]): Promise<string[]> => {
    if (!user || files.length === 0) return [];
    const urls: string[] = [];
    const timestamp = Date.now();

    for (let i = 0; i < files.length; i++) {
      // Compress images >4MB to stay under Claude's 5MB base64 limit
      const compressed = await compressImage(files[i], 4000);
      const filePath = `${user.id}/${date}/${timestamp}-${i}.jpg`;
      const { error } = await supabase.storage
        .from('food-photos')
        .upload(filePath, compressed, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (!error) {
        const { data: urlData, error: urlError } = await supabase.storage
          .from('food-photos')
          .createSignedUrl(filePath, FOOD_PHOTO_URL_TTL_SECONDS);
        if (!urlError && urlData?.signedUrl) {
          urls.push(urlData.signedUrl);
        }
      }
    }
    return urls;
  };

  const addEntry = async (entry: AddFoodInput) => {
    if (!user) return { error: new Error('Not authenticated') };

    const photoUrls = entry.photos ? await uploadPhotos(entry.photos) : [];
    const leftoversUrls = entry.leftovers_photos ? await uploadPhotos(entry.leftovers_photos) : [];
    const allPhotoUrls = [...photoUrls, ...leftoversUrls];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch with placeholder Database types
    const foodTable = supabase.from('food_logs') as ReturnType<typeof supabase.from> & { insert: (v: Record<string, unknown>) => ReturnType<ReturnType<typeof supabase.from>['insert']> };
    const { data, error } = await foodTable.insert({
      user_id: user.id,
      log_date: date,
      meal_type: entry.meal_type,
      meal_time: entry.meal_time ?? null,
      description: entry.description,
      calories: entry.calories ?? null,
      protein: entry.protein ?? null,
      carbs: entry.carbs ?? null,
      fat: entry.fat ?? null,
      fiber: null,
      sugar: null,
      ai_analyzed: false,
      ai_confidence: null,
      ai_pcos_notes: null,
      photo_url: allPhotoUrls.length > 0 ? allPhotoUrls[0] : null,
      photo_urls: allPhotoUrls.length > 0 ? allPhotoUrls : null,
      user_edited: false,
      notes: null,
    }).select().single();

    if (!error) {
      await fetchEntries();
      // Trigger AI analysis in the background (don't await)
      if (data?.id) {
        if (leftoversUrls.length > 0) {
          // Has leftovers — trigger in leftovers mode
          triggerAnalysis(data.id as string, 'leftovers', leftoversUrls[0]);
        } else {
          triggerAnalysis(data.id as string);
        }
      }
    }
    return { error };
  };

  const deleteEntry = async (id: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('food_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (!error) await fetchEntries();
  };

  const updateMealType = async (id: string, mealType: FoodLog['meal_type']) => {
    if (!user) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
    const { error } = await (supabase.from('food_logs') as any)
      .update({ meal_type: mealType })
      .eq('id', id)
      .eq('user_id', user.id);
    if (!error) await fetchEntries();
  };

  const addLeftoversPhoto = async (entryId: string, photoFile: File) => {
    if (!user) return;
    const timestamp = Date.now();
    const filePath = `${user.id}/${date}/${timestamp}-leftovers.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('food-photos')
      .upload(filePath, photoFile, {
        contentType: photoFile.type || 'image/jpeg',
        upsert: false,
      });
    if (uploadError) {
      console.error('Failed to upload leftovers photo:', uploadError);
      return;
    }
    const { data: urlData, error: urlError } = await supabase.storage
      .from('food-photos')
      .createSignedUrl(filePath, FOOD_PHOTO_URL_TTL_SECONDS);
    if (urlError || !urlData?.signedUrl) {
      console.error('Failed to create private leftovers photo URL:', urlError);
      return;
    }

    // Mark entry as re-analyzing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
    await (supabase.from('food_logs') as any)
      .update({ ai_analyzed: false })
      .eq('id', entryId)
      .eq('user_id', user.id);

    await fetchEntries();
    // Trigger leftovers analysis
    triggerAnalysis(entryId, 'leftovers', urlData.signedUrl);
  };

  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories ?? 0),
      protein: acc.protein + (e.protein ?? 0),
    }),
    { calories: 0, protein: 0 },
  );

  const updateEntry = async (id: string, updates: Partial<Pick<FoodLog, 'description' | 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber'>>) => {
    if (!user) return;
    const payload: Record<string, unknown> = { ...updates, user_edited: true };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
    const { error } = await (supabase.from('food_logs') as any)
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id);
    if (!error) await fetchEntries();
  };

  return { entries, loading, addEntry, deleteEntry, updateMealType, updateEntry, addLeftoversPhoto, totals, refresh: fetchEntries };
}
