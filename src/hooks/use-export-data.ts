import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { toDateKey } from '../utils/storage';

function toCSV(headers: string[], rows: string[][]): string {
  const escape = (v: string) => {
    if (v.includes(',') || v.includes('"') || v.includes('\n')) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };
  const lines = [headers.map(escape).join(',')];
  for (const row of rows) {
    lines.push(row.map((v) => escape(v ?? '')).join(','));
  }
  return lines.join('\n');
}

function downloadCSV(filename: string, content: string) {
  if (Platform.OS !== 'web') return;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function useExportData(userId?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const exportData = useCallback(async () => {
    if (!userId) {
      setError('Not logged in');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDate = toDateKey(thirtyDaysAgo);
      const endDate = toDateKey(new Date());

      // Fetch all data in parallel
      const [dailyLogs, foodLogs, weightLogs, waterLogs, symptoms, calfMeasurements] =
        await Promise.all([
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase.from('daily_logs') as any)
            .select('log_date, mood, period, exercise, health_notes, wore_compression_socks, wore_calf_sleeves, stretched_minutes, calf_notes')
            .eq('user_id', userId)
            .gte('log_date', startDate)
            .lte('log_date', endDate)
            .order('log_date', { ascending: true }),
          supabase
            .from('food_logs')
            .select('log_date, meal_type, description, calories, protein, carbs, fat, fiber, notes')
            .eq('user_id', userId)
            .gte('log_date', startDate)
            .lte('log_date', endDate)
            .order('log_date', { ascending: true }),
          supabase
            .from('weight_logs')
            .select('log_date, weight, notes')
            .eq('user_id', userId)
            .gte('log_date', startDate)
            .lte('log_date', endDate)
            .order('log_date', { ascending: true }),
          supabase
            .from('water_logs')
            .select('log_date, glasses')
            .eq('user_id', userId)
            .gte('log_date', startDate)
            .lte('log_date', endDate)
            .order('log_date', { ascending: true }),
          supabase
            .from('symptoms')
            .select('log_date, bloating, acne, hair_loss, fatigue, brain_fog, cravings, anxiety, mood, energy_level, notes')
            .eq('user_id', userId)
            .gte('log_date', startDate)
            .lte('log_date', endDate)
            .order('log_date', { ascending: true }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase.from('calf_measurements') as any)
            .select('measure_date, left_calf_cm, right_calf_cm, ankle_flexion_degrees, notes')
            .eq('user_id', userId)
            .gte('measure_date', startDate)
            .lte('measure_date', endDate)
            .order('measure_date', { ascending: true }),
        ]);

      // Build daily summary CSV
      const headers = [
        'Date',
        'Weight',
        'Water (glasses)',
        'Mood',
        'Energy',
        'Calories',
        'Protein (g)',
        'Carbs (g)',
        'Fat (g)',
        'Bloating',
        'Acne',
        'Fatigue',
        'Brain Fog',
        'Cravings',
        'Anxiety',
        'Compression Socks',
        'Calf Sleeves',
        'Stretch Minutes',
        'Left Calf (cm)',
        'Right Calf (cm)',
        'Ankle Flexion (°)',
        'Calf Notes',
        'Health Notes',
      ];

      // Index data by date
      const dateMap: Record<string, Record<string, string>> = {};
      const ensureDate = (d: string) => {
        if (!dateMap[d]) dateMap[d] = {};
        return dateMap[d];
      };

      // Daily logs (mood, period, exercise, calf daily data)
      for (const row of dailyLogs.data ?? []) {
        const r = ensureDate(row.log_date);
        try {
          const mood = JSON.parse(row.mood ?? '{}');
          r['Mood'] = mood.mood ?? '';
          r['Energy'] = mood.energy ?? '';
        } catch {
          r['Mood'] = row.mood ?? '';
        }
        r['Compression Socks'] = row.wore_compression_socks ? 'Yes' : 'No';
        r['Calf Sleeves'] = row.wore_calf_sleeves ? 'Yes' : 'No';
        r['Stretch Minutes'] = String(row.stretched_minutes ?? 0);
        r['Calf Notes'] = row.calf_notes ?? '';
        r['Health Notes'] = row.health_notes ?? '';
      }

      // Food — sum calories/macros per day
      for (const row of foodLogs.data ?? []) {
        const r = ensureDate(row.log_date);
        r['Calories'] = String(Number(r['Calories'] || 0) + (row.calories ?? 0));
        r['Protein (g)'] = String(Number(r['Protein (g)'] || 0) + Number(row.protein ?? 0));
        r['Carbs (g)'] = String(Number(r['Carbs (g)'] || 0) + Number(row.carbs ?? 0));
        r['Fat (g)'] = String(Number(r['Fat (g)'] || 0) + Number(row.fat ?? 0));
      }

      // Weight
      for (const row of weightLogs.data ?? []) {
        ensureDate(row.log_date)['Weight'] = String(row.weight);
      }

      // Water
      for (const row of waterLogs.data ?? []) {
        ensureDate(row.log_date)['Water (glasses)'] = String(row.glasses);
      }

      // Symptoms
      for (const row of symptoms.data ?? []) {
        const r = ensureDate(row.log_date);
        r['Bloating'] = String(row.bloating ?? 0);
        r['Acne'] = String(row.acne ?? 0);
        r['Fatigue'] = String(row.fatigue ?? 0);
        r['Brain Fog'] = String(row.brain_fog ?? 0);
        r['Cravings'] = String(row.cravings ?? 0);
        r['Anxiety'] = String(row.anxiety ?? 0);
      }

      // Calf measurements
      for (const row of calfMeasurements.data ?? []) {
        const r = ensureDate(row.measure_date);
        r['Left Calf (cm)'] = String(row.left_calf_cm);
        r['Right Calf (cm)'] = String(row.right_calf_cm);
        r['Ankle Flexion (°)'] = String(row.ankle_flexion_degrees ?? '');
      }

      // Build rows sorted by date
      const dates = Object.keys(dateMap).sort();
      const rows = dates.map((date) => {
        const r = dateMap[date];
        return headers.map((h) => (h === 'Date' ? date : r[h] ?? ''));
      });

      const csv = toCSV(headers, rows);
      const filename = `healthy-me-export-${endDate}.csv`;
      downloadCSV(filename, csv);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message ?? 'Export failed');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return { loading, error, success, exportData };
}
