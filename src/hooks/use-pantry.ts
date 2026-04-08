import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { SavedMeal } from '../types/database';

export function usePantry() {
  const { user } = useAuth();
  const [pantryItems, setPantryItems] = useState<SavedMeal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPantry = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- saved_meals not in generated types yet
    const { data, error } = await (supabase.from('saved_meals') as any)
      .select('*')
      .eq('user_id', user.id)
      .eq('is_pantry', true)
      .order('created_at', { ascending: false });

    if (!error && data) setPantryItems(data as SavedMeal[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPantry();
  }, [fetchPantry]);

  useFocusEffect(
    useCallback(() => {
      fetchPantry();
    }, [fetchPantry]),
  );

  const addToPantry = useCallback(
    async (meal: Partial<SavedMeal> & { name: string }): Promise<{ error?: Error }> => {
      if (!user) return { error: new Error('Not authenticated') };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- saved_meals not in generated types yet
      const { error } = await (supabase.from('saved_meals') as any).insert({
        user_id: user.id,
        name: meal.name,
        description: meal.description ?? meal.name,
        meal_type: meal.meal_type ?? 'snack',
        calories: meal.calories ?? null,
        protein: meal.protein ?? null,
        carbs: meal.carbs ?? null,
        fat: meal.fat ?? null,
        fiber: meal.fiber ?? null,
        pcos_notes: meal.pcos_notes ?? null,
        brand: meal.brand ?? null,
        serving_size: meal.serving_size ?? null,
        serving_unit: meal.serving_unit ?? 'serving',
        is_pantry: true,
        use_count: 0,
        last_used_at: null,
      });
      if (!error) await fetchPantry();
      return { error: error ? new Error(error.message) : undefined };
    },
    [user, fetchPantry],
  );

  const removeFromPantry = useCallback(
    async (id: string): Promise<{ error?: Error }> => {
      if (!user) return { error: new Error('Not authenticated') };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- saved_meals not in generated types yet
      const { error } = await (supabase.from('saved_meals') as any)
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) return { error: new Error(error.message) };
      await fetchPantry();
      return {};
    },
    [user, fetchPantry],
  );

  const logFromPantry = useCallback(
    async (meal: SavedMeal, date: string): Promise<{ error?: Error }> => {
      if (!user) return { error: new Error('Not authenticated') };

      // Create food_log entry from pantry item
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
      const { error: insertError } = await (supabase.from('food_logs') as any).insert({
        user_id: user.id,
        log_date: date,
        meal_type: meal.meal_type ?? 'snack',
        description: meal.name,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        fiber: meal.fiber,
        sugar: null,
        ai_analyzed: true,
        ai_confidence: 1.0,
        ai_pcos_notes: meal.pcos_notes,
        photo_url: null,
        photo_urls: null,
        user_edited: false,
        notes: 'from_pantry',
      });

      if (insertError) return { error: new Error(insertError.message) };

      // Increment use_count and update last_used_at
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- saved_meals not in generated types yet
      await (supabase.from('saved_meals') as any)
        .update({
          use_count: (meal.use_count ?? 0) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', meal.id)
        .eq('user_id', user.id);

      await fetchPantry();
      return {};
    },
    [user, fetchPantry],
  );

  return { pantryItems, loading, addToPantry, removeFromPantry, logFromPantry, refresh: fetchPantry };
}
