import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { FoodLog } from '../types/database';

interface FoodTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface AddFoodInput {
  meal_type: FoodLog['meal_type'];
  description: string;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function useFoodLog() {
  const { user } = useAuth();
  const [todaysFoods, setTodaysFoods] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);

  const totals: FoodTotals = todaysFoods.reduce(
    (acc, food) => ({
      calories: acc.calories + (food.calories ?? 0),
      protein: acc.protein + (food.protein ?? 0),
      carbs: acc.carbs + (food.carbs ?? 0),
      fat: acc.fat + (food.fat ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const fetchTodaysFoods = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('log_date', getTodayDate())
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTodaysFoods((data as FoodLog[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTodaysFoods();
  }, [fetchTodaysFoods]);

  const addFood = useCallback(
    async (food: AddFoodInput) => {
      if (!user) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch with placeholder types
      const { error } = await (supabase.from('food_logs') as any).insert({
        user_id: user.id,
        log_date: getTodayDate(),
        meal_type: food.meal_type,
        description: food.description,
        calories: food.calories ?? null,
        protein: food.protein ?? null,
        carbs: food.carbs ?? null,
        fat: food.fat ?? null,
        fiber: null,
        sugar: null,
        ai_analyzed: false,
        ai_confidence: null,
        ai_pcos_notes: null,
        photo_url: null,
        user_edited: false,
        notes: null,
      });
      if (error) throw error;
      await fetchTodaysFoods();
    },
    [user, fetchTodaysFoods],
  );

  const deleteFood = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from('food_logs')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await fetchTodaysFoods();
    },
    [fetchTodaysFoods],
  );

  return { todaysFoods, totals, addFood, deleteFood, loading, refetch: fetchTodaysFoods };
}
