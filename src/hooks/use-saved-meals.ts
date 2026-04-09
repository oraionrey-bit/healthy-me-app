import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { SavedMeal, FoodLog } from '../types/database';

export function useSavedMeals() {
  const { user } = useAuth();
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSavedMeals = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- saved_meals not in generated types yet
    const { data, error } = await (supabase.from('saved_meals') as any)
      .select('*')
      .eq('user_id', user.id)
      .eq('is_favorite', true)
      .order('use_count', { ascending: false });

    if (!error && data) setSavedMeals(data as SavedMeal[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSavedMeals();
  }, [fetchSavedMeals]);

  useFocusEffect(
    useCallback(() => {
      fetchSavedMeals();
    }, [fetchSavedMeals]),
  );

  const saveMeal = useCallback(
    async (foodLog: FoodLog): Promise<{ error?: Error }> => {
      if (!user) return { error: new Error('Not authenticated') };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- saved_meals not in generated types yet
      // Check if a saved_meal for this food already exists (from auto-save)
      const name = (foodLog.description || 'Saved Meal').trim();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase.from('saved_meals') as any)
        .select('id')
        .eq('user_id', user.id)
        .ilike('name', name)
        .limit(1)
        .single();

      let error: { message: string } | null = null;

      if (existing?.id) {
        // Mark existing personal food as favorite
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (supabase.from('saved_meals') as any)
          .update({ is_favorite: true })
          .eq('id', existing.id)
          .eq('user_id', user.id);
        error = result.error;
      } else {
        // Insert new favorite
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (supabase.from('saved_meals') as any).insert({
          user_id: user.id,
          name,
          description: foodLog.description,
          meal_type: foodLog.meal_type,
          calories: foodLog.calories,
          protein: foodLog.protein,
          carbs: foodLog.carbs,
          fat: foodLog.fat,
          fiber: foodLog.fiber,
          pcos_notes: foodLog.ai_pcos_notes,
          use_count: 0,
          last_used_at: null,
          is_favorite: true,
        });
        error = result.error;
      }
      if (!error) await fetchSavedMeals();
      return { error: error ? new Error(error.message) : undefined };
    },
    [user, fetchSavedMeals],
  );

  const logSavedMeal = useCallback(
    async (savedMealId: string, date: string): Promise<{ error?: Error }> => {
      if (!user) return { error: new Error('Not authenticated') };
      const meal = savedMeals.find((m) => m.id === savedMealId);
      if (!meal) return { error: new Error('Saved meal not found') };

      // Create food_log entry from saved meal
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
        notes: 'from_saved_meal',
      });

      if (insertError) return { error: new Error(insertError.message) };

      // Increment use_count and update last_used_at
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- saved_meals not in generated types yet
      await (supabase.from('saved_meals') as any)
        .update({
          use_count: (meal.use_count ?? 0) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', savedMealId)
        .eq('user_id', user.id);

      await fetchSavedMeals();
      return {};
    },
    [user, savedMeals, fetchSavedMeals],
  );

  const deleteSavedMeal = useCallback(
    async (id: string): Promise<{ error?: Error }> => {
      if (!user) return { error: new Error('Not authenticated') };
      // Unfavorite instead of deleting — keeps the personal food dictionary entry
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- saved_meals not in generated types yet
      const { error } = await (supabase.from('saved_meals') as any)
        .update({ is_favorite: false })
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) {
        console.warn('Failed to delete saved meal:', error);
        return { error: new Error(error.message) };
      }
      await fetchSavedMeals();
      return {};
    },
    [user, fetchSavedMeals],
  );

  return { savedMeals, loading, saveMeal, logSavedMeal, deleteSavedMeal, refresh: fetchSavedMeals };
}
