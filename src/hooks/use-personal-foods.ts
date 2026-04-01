import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { fuzzyMatch, normalizeText } from '../utils/fuzzy-match';
import type { SavedMeal, FoodLog } from '../types/database';

export { fuzzyMatch } from '../utils/fuzzy-match';

export interface PersonalFoodSearchResult {
  meal: SavedMeal;
  score: number;
}

export function usePersonalFoods() {
  const { user } = useAuth();
  const [allFoods, setAllFoods] = useState<SavedMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const lastFetchRef = useRef(0);

  const fetchAllFoods = useCallback(async () => {
    if (!user) return;

    // Debounce rapid fetches
    const now = Date.now();
    if (now - lastFetchRef.current < 1000) return;
    lastFetchRef.current = now;

    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- saved_meals not in generated types
    const { data, error } = await (supabase.from('saved_meals') as any)
      .select('*')
      .eq('user_id', user.id)
      .order('use_count', { ascending: false });

    if (!error && data) {
      setAllFoods(data as SavedMeal[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAllFoods();
  }, [fetchAllFoods]);

  useFocusEffect(
    useCallback(() => {
      fetchAllFoods();
    }, [fetchAllFoods]),
  );

  /**
   * Search personal foods with fuzzy matching.
   * Returns results sorted by match score (weighted by frequency).
   */
  const searchFoods = useCallback(
    (query: string, limit = 8): PersonalFoodSearchResult[] => {
      if (!query.trim() || query.trim().length < 2) return [];

      const results: PersonalFoodSearchResult[] = [];

      for (const meal of allFoods) {
        const nameScore = fuzzyMatch(query, meal.name, meal.aliases ?? []);
        const descScore = meal.description ? fuzzyMatch(query, meal.description) * 0.5 : 0;
        const matchScore = Math.max(nameScore, descScore);

        if (matchScore > 20) {
          // Weight by frequency and recency
          const freqBonus = Math.min(meal.use_count * 2, 20);
          const recencyBonus = meal.last_used_at
            ? Math.max(0, 10 - Math.floor((Date.now() - new Date(meal.last_used_at).getTime()) / (1000 * 60 * 60 * 24)))
            : 0;
          const finalScore = matchScore + freqBonus + recencyBonus;

          results.push({ meal, score: finalScore });
        }
      }

      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    },
    [allFoods],
  );

  /**
   * Get recent foods (last 7 days, deduplicated by name).
   */
  const recentFoods = useMemo((): SavedMeal[] => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return allFoods
      .filter((m) => m.last_used_at && new Date(m.last_used_at).getTime() > sevenDaysAgo)
      .sort((a, b) => new Date(b.last_used_at!).getTime() - new Date(a.last_used_at!).getTime())
      .slice(0, 10);
  }, [allFoods]);

  /**
   * Get top frequent foods.
   */
  const frequentFoods = useMemo((): SavedMeal[] => {
    return allFoods
      .filter((m) => m.use_count > 0)
      .sort((a, b) => b.use_count - a.use_count)
      .slice(0, 10);
  }, [allFoods]);

  /**
   * Auto-save a food log entry to the personal food dictionary.
   * Upserts by name match — if a food with similar name exists, update it instead.
   */
  const autoSaveFromAnalysis = useCallback(
    async (foodLog: FoodLog): Promise<void> => {
      if (!user || !foodLog.ai_analyzed || foodLog.calories == null) return;

      const name = (foodLog.description || '').trim();
      if (!name) return;

      // Check if we already have this food (case-insensitive name match)
      const existing = allFoods.find(
        (m) => normalizeText(m.name) === normalizeText(name),
      );

      if (existing) {
        // Update: increment use_count, refresh last_used_at
        // If user hasn't edited, update nutrition too (AI may have improved)
        const updates: Record<string, unknown> = {
          use_count: existing.use_count + 1,
          last_used_at: new Date().toISOString(),
        };

        // Update nutrition if this is a fresh AI analysis (not user-edited)
        if (!foodLog.user_edited && existing.source === 'ai_analyzed') {
          updates.calories = foodLog.calories;
          updates.protein = foodLog.protein;
          updates.carbs = foodLog.carbs;
          updates.fat = foodLog.fat;
          updates.fiber = foodLog.fiber;
          updates.pcos_notes = foodLog.ai_pcos_notes;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('saved_meals') as any)
          .update(updates)
          .eq('id', existing.id)
          .eq('user_id', user.id);
      } else {
        // Insert new personal food entry
        const providerNote = foodLog.notes ?? '';
        const analyzedBy = providerNote.includes('claude') ? 'Claude' : providerNote.includes('gemini') ? 'Gemini' : 'AI';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('saved_meals') as any).insert({
          user_id: user.id,
          name,
          description: foodLog.description,
          meal_type: foodLog.meal_type,
          calories: foodLog.calories,
          protein: foodLog.protein,
          carbs: foodLog.carbs,
          fat: foodLog.fat,
          fiber: foodLog.fiber,
          pcos_notes: foodLog.ai_pcos_notes ?? `Analyzed by ${analyzedBy}`,
          use_count: 1,
          last_used_at: new Date().toISOString(),
          aliases: [],
          source: 'ai_analyzed',
          serving_size: null,
          serving_unit: 'serving',
          is_favorite: false,
          original_ai_calories: foodLog.calories,
          original_ai_protein: foodLog.protein,
          original_ai_carbs: foodLog.carbs,
          original_ai_fat: foodLog.fat,
        });
      }

      // Refresh the local cache
      await fetchAllFoods();
    },
    [user, allFoods, fetchAllFoods],
  );

  /**
   * Update personal food when user edits a food log entry.
   */
  const updateFromUserEdit = useCallback(
    async (foodLog: FoodLog): Promise<void> => {
      if (!user || !foodLog.description) return;

      const name = foodLog.description.trim();
      const existing = allFoods.find(
        (m) => normalizeText(m.name) === normalizeText(name),
      );

      if (existing) {
        const updates: Record<string, unknown> = {
          calories: foodLog.calories,
          protein: foodLog.protein,
          carbs: foodLog.carbs,
          fat: foodLog.fat,
          fiber: foodLog.fiber,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('saved_meals') as any)
          .update(updates)
          .eq('id', existing.id)
          .eq('user_id', user.id);

        await fetchAllFoods();
      }
    },
    [user, allFoods, fetchAllFoods],
  );

  return {
    allFoods,
    loading,
    searchFoods,
    recentFoods,
    frequentFoods,
    autoSaveFromAnalysis,
    updateFromUserEdit,
    refresh: fetchAllFoods,
  };
}
