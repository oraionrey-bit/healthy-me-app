import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { FoodLog } from '../types/database';

const POLL_INTERVAL_MS = 30_000;

interface AddFoodInput {
  meal_type: FoodLog['meal_type'];
  description: string;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  photos?: File[];
}

/**
 * Trigger AI analysis of a food log entry via the analyze-food Edge Function.
 * Fire-and-forget — doesn't block the UI.
 */
async function triggerAnalysis(foodLogId: string): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) return;

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
    await fetch(`${supabaseUrl}/functions/v1/analyze-food`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
      },
      body: JSON.stringify({ food_log_id: foodLogId }),
    });
  } catch (err) {
    console.error('Failed to trigger food analysis:', err);
  }
}

export function useFoodLog(date: string) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
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
  useFocusEffect(
    useCallback(() => {
      fetchEntries();
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
      const filePath = `${user.id}/${date}/${timestamp}-${i}.jpg`;
      const { error } = await supabase.storage
        .from('food-photos')
        .upload(filePath, files[i], {
          contentType: files[i].type || 'image/jpeg',
          upsert: false,
        });

      if (!error) {
        const { data: urlData } = supabase.storage
          .from('food-photos')
          .getPublicUrl(filePath);
        urls.push(urlData.publicUrl);
      }
    }
    return urls;
  };

  const addEntry = async (entry: AddFoodInput) => {
    if (!user) return { error: new Error('Not authenticated') };

    const photoUrls = entry.photos ? await uploadPhotos(entry.photos) : [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch with placeholder Database types
    const foodTable = supabase.from('food_logs') as ReturnType<typeof supabase.from> & { insert: (v: Record<string, unknown>) => ReturnType<ReturnType<typeof supabase.from>['insert']> };
    const { data, error } = await foodTable.insert({
      user_id: user.id,
      log_date: date,
      meal_type: entry.meal_type,
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
      photo_url: photoUrls.length > 0 ? photoUrls[0] : null,
      photo_urls: photoUrls.length > 0 ? photoUrls : null,
      user_edited: false,
      notes: null,
    }).select().single();

    if (!error) {
      await fetchEntries();
      // Trigger AI analysis in the background (don't await)
      if (data?.id) {
        triggerAnalysis(data.id as string);
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

  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories ?? 0),
      protein: acc.protein + (e.protein ?? 0),
    }),
    { calories: 0, protein: 0 },
  );

  return { entries, loading, addEntry, deleteEntry, totals, refresh: fetchEntries };
}
