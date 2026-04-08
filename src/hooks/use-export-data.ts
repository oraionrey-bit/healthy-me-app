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

/**
 * Parse health_notes JSON into readable text.
 * health_notes may be a JSON string like '{"skincare":"done","water":"8 glasses"}'
 * or plain text. Returns a human-readable string either way.
 */
function formatHealthNotes(raw: string | null | undefined): string {
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return Object.entries(parsed)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([key, value]) => {
          const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
          if (typeof value === 'object') {
            return `${label}: ${JSON.stringify(value)}`;
          }
          return `${label}: ${value}`;
        })
        .join('; ');
    }
    if (Array.isArray(parsed)) {
      return parsed.map(String).join('; ');
    }
    return String(parsed);
  } catch {
    // Not JSON — return as-is (plain text notes)
    return raw;
  }
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

function boolToYesNo(v: boolean | null | undefined): string {
  if (v === true) return 'Yes';
  if (v === false) return 'No';
  return '';
}

function arrToString(v: string[] | null | undefined): string {
  if (!v || !Array.isArray(v)) return '';
  return v.join(', ');
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      const [
        dailyLogs,
        foodLogs,
        weightLogs,
        waterLogs,
        symptoms,
        calfMeasurements,
        supplementLogs,
        userSupplements,
        exerciseLogs,
        periodLogs,
        skinPhotos,
        skincareLogs,
        savedMeals,
        healthLabs,
      ] = await Promise.all([
        db.from('daily_logs')
          .select('log_date, mood, period, exercise, health_notes, wore_compression_socks, wore_calf_sleeves, stretched_minutes, calf_notes')
          .eq('user_id', userId)
          .gte('log_date', startDate)
          .lte('log_date', endDate)
          .order('log_date', { ascending: true }),
        db.from('food_logs')
          .select('log_date, meal_type, description, calories, protein, carbs, fat, fiber, sugar, ai_pcos_notes, notes')
          .eq('user_id', userId)
          .gte('log_date', startDate)
          .lte('log_date', endDate)
          .order('log_date', { ascending: true }),
        db.from('weight_logs')
          .select('log_date, weight, notes')
          .eq('user_id', userId)
          .gte('log_date', startDate)
          .lte('log_date', endDate)
          .order('log_date', { ascending: true }),
        db.from('water_logs')
          .select('log_date, glasses')
          .eq('user_id', userId)
          .gte('log_date', startDate)
          .lte('log_date', endDate)
          .order('log_date', { ascending: true }),
        db.from('symptoms')
          .select('log_date, bloating, acne, hair_loss, hirsutism, fatigue, brain_fog, cravings, anxiety, mood, energy_level, notes')
          .eq('user_id', userId)
          .gte('log_date', startDate)
          .lte('log_date', endDate)
          .order('log_date', { ascending: true }),
        db.from('calf_measurements')
          .select('measure_date, left_calf_cm, right_calf_cm, ankle_flexion_degrees, notes')
          .eq('user_id', userId)
          .gte('measure_date', startDate)
          .lte('measure_date', endDate)
          .order('measure_date', { ascending: true }),
        db.from('supplement_logs')
          .select('log_date, user_supplement_id, taken, taken_at, notes')
          .eq('user_id', userId)
          .gte('log_date', startDate)
          .lte('log_date', endDate)
          .order('log_date', { ascending: true }),
        db.from('user_supplements')
          .select('id, supplement_name, dosage, frequency, time_of_day, is_active, notes')
          .eq('user_id', userId)
          .eq('is_active', true),
        db.from('exercise_logs')
          .select('log_date, exercise_type, duration_minutes, calories_burned, intensity, steps, sleep_score, activity_score, notes')
          .eq('user_id', userId)
          .gte('log_date', startDate)
          .lte('log_date', endDate)
          .order('log_date', { ascending: true }),
        db.from('period_logs')
          .select('log_date, flow, cramps, headache, back_pain, notes')
          .eq('user_id', userId)
          .gte('log_date', startDate)
          .lte('log_date', endDate)
          .order('log_date', { ascending: true }),
        db.from('skin_photos')
          .select('photo_date, photo_url, angle, acne_severity, notes')
          .eq('user_id', userId)
          .gte('photo_date', startDate)
          .lte('photo_date', endDate)
          .order('photo_date', { ascending: true }),
        db.from('skincare_logs')
          .select('log_date, products_used, am_routine_done, pm_routine_done, am_steps_completed, pm_steps_completed, skin_score, breakouts, breakout_locations, dryness, oiliness, sensitivity, texture, testing_product, test_reaction, test_day, cycle_day, notes')
          .eq('user_id', userId)
          .gte('log_date', startDate)
          .lte('log_date', endDate)
          .order('log_date', { ascending: true }),
        db.from('saved_meals')
          .select('name, description, meal_type, calories, protein, carbs, fat, fiber, source, serving_size, serving_unit, use_count, is_favorite, created_at')
          .eq('user_id', userId)
          .order('use_count', { ascending: false }),
        db.from('health_labs')
          .select('test_date, test_name, value, unit, reference_range_low, reference_range_high, is_flagged, notes')
          .eq('user_id', userId)
          .order('test_date', { ascending: true }),
      ]);

      // Build a supplement name lookup
      const supplementNames: Record<string, string> = {};
      for (const s of userSupplements.data ?? []) {
        supplementNames[s.id] = `${s.supplement_name}${s.dosage ? ` (${s.dosage})` : ''}`;
      }

      // ============================================
      // SECTION 1: Daily Summary (merged view)
      // ============================================
      const summaryHeaders = [
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
        'Period Flow',
        'Cramps',
        'Compression Socks',
        'Calf Sleeves',
        'Stretch Minutes',
        'Left Calf (cm)',
        'Right Calf (cm)',
        'Ankle Flexion (°)',
        'Calf Notes',
        'Health Notes',
      ];

      const dateMap: Record<string, Record<string, string>> = {};
      const ensureDate = (d: string) => {
        if (!dateMap[d]) dateMap[d] = {};
        return dateMap[d];
      };

      // Daily logs
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
        r['Health Notes'] = formatHealthNotes(row.health_notes);
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

      // Period logs — add flow/cramps to summary
      for (const row of periodLogs.data ?? []) {
        const r = ensureDate(row.log_date);
        r['Period Flow'] = row.flow ?? '';
        r['Cramps'] = String(row.cramps ?? 0);
      }

      // Calf measurements
      for (const row of calfMeasurements.data ?? []) {
        const r = ensureDate(row.measure_date);
        r['Left Calf (cm)'] = String(row.left_calf_cm);
        r['Right Calf (cm)'] = String(row.right_calf_cm);
        r['Ankle Flexion (°)'] = String(row.ankle_flexion_degrees ?? '');
      }

      const dates = Object.keys(dateMap).sort();
      const summaryRows = dates.map((date) => {
        const r = dateMap[date];
        return summaryHeaders.map((h) => (h === 'Date' ? date : r[h] ?? ''));
      });

      // ============================================
      // SECTION 2: Food Logs (detailed per-meal)
      // ============================================
      const foodHeaders = ['Date', 'Meal', 'Description', 'Calories', 'Protein', 'Carbs', 'Fat', 'Fiber', 'Sugar', 'PCOS Notes', 'Notes'];
      const foodRows = (foodLogs.data ?? []).map((row: any) => [
        row.log_date,
        row.meal_type,
        row.description ?? '',
        String(row.calories ?? ''),
        String(row.protein ?? ''),
        String(row.carbs ?? ''),
        String(row.fat ?? ''),
        String(row.fiber ?? ''),
        String(row.sugar ?? ''),
        row.ai_pcos_notes ?? '',
        row.notes ?? '',
      ]);

      // ============================================
      // SECTION 3: Water Logs
      // ============================================
      const waterHeaders = ['Date', 'Glasses'];
      const waterRows = (waterLogs.data ?? []).map((row: any) => [
        row.log_date,
        String(row.glasses),
      ]);

      // ============================================
      // SECTION 4: Supplement Logs
      // ============================================
      const supplementHeaders = ['Date', 'Supplement', 'Taken', 'Taken At', 'Notes'];
      const supplementRows = (supplementLogs.data ?? []).map((row: any) => [
        row.log_date,
        supplementNames[row.user_supplement_id] ?? row.user_supplement_id,
        row.taken ? 'Yes' : 'No',
        row.taken_at ?? '',
        row.notes ?? '',
      ]);

      // ============================================
      // SECTION 5: User Supplements (reference list)
      // ============================================
      const userSuppHeaders = ['Supplement', 'Dosage', 'Frequency', 'Time of Day', 'Active', 'Notes'];
      const userSuppRows = (userSupplements.data ?? []).map((row: any) => [
        row.supplement_name,
        row.dosage ?? '',
        row.frequency ?? '',
        row.time_of_day ?? '',
        row.is_active ? 'Yes' : 'No',
        row.notes ?? '',
      ]);

      // ============================================
      // SECTION 6: Exercise Logs
      // ============================================
      const exerciseHeaders = ['Date', 'Type', 'Duration (min)', 'Calories Burned', 'Intensity', 'Steps', 'Sleep Score', 'Activity Score', 'Notes'];
      const exerciseRows = (exerciseLogs.data ?? []).map((row: any) => [
        row.log_date,
        row.exercise_type,
        String(row.duration_minutes ?? ''),
        String(row.calories_burned ?? ''),
        row.intensity ?? '',
        String(row.steps ?? ''),
        String(row.sleep_score ?? ''),
        String(row.activity_score ?? ''),
        row.notes ?? '',
      ]);

      // ============================================
      // SECTION 7: Weight Logs
      // ============================================
      const weightHeaders = ['Date', 'Weight', 'Notes'];
      const weightRows = (weightLogs.data ?? []).map((row: any) => [
        row.log_date,
        String(row.weight),
        row.notes ?? '',
      ]);

      // ============================================
      // SECTION 8: Symptoms
      // ============================================
      const symptomHeaders = ['Date', 'Bloating', 'Acne', 'Hair Loss', 'Hirsutism', 'Fatigue', 'Brain Fog', 'Cravings', 'Anxiety', 'Mood', 'Energy', 'Notes'];
      const symptomRows = (symptoms.data ?? []).map((row: any) => [
        row.log_date,
        String(row.bloating ?? 0),
        String(row.acne ?? 0),
        String(row.hair_loss ?? 0),
        String(row.hirsutism ?? 0),
        String(row.fatigue ?? 0),
        String(row.brain_fog ?? 0),
        String(row.cravings ?? 0),
        String(row.anxiety ?? 0),
        String(row.mood ?? ''),
        String(row.energy_level ?? ''),
        row.notes ?? '',
      ]);

      // ============================================
      // SECTION 9: Period Logs
      // ============================================
      const periodHeaders = ['Date', 'Flow', 'Cramps', 'Headache', 'Back Pain', 'Notes'];
      const periodRows = (periodLogs.data ?? []).map((row: any) => [
        row.log_date,
        row.flow ?? '',
        String(row.cramps ?? 0),
        boolToYesNo(row.headache),
        boolToYesNo(row.back_pain),
        row.notes ?? '',
      ]);

      // ============================================
      // SECTION 10: Skin Photos
      // ============================================
      const skinPhotoHeaders = ['Date', 'Angle', 'Acne Severity', 'Photo URL', 'Notes'];
      const skinPhotoRows = (skinPhotos.data ?? []).map((row: any) => [
        row.photo_date,
        row.angle ?? '',
        String(row.acne_severity ?? ''),
        row.photo_url ?? '',
        row.notes ?? '',
      ]);

      // ============================================
      // SECTION 11: Skincare Logs
      // ============================================
      const skincareHeaders = [
        'Date', 'AM Routine', 'PM Routine', 'Products Used',
        'AM Steps', 'PM Steps', 'Skin Score', 'Breakouts',
        'Breakout Locations', 'Dryness', 'Oiliness', 'Sensitivity',
        'Texture', 'Testing Product', 'Test Reaction', 'Test Day',
        'Cycle Day', 'Notes',
      ];
      const skincareRows = (skincareLogs.data ?? []).map((row: any) => [
        row.log_date,
        boolToYesNo(row.am_routine_done),
        boolToYesNo(row.pm_routine_done),
        arrToString(row.products_used),
        arrToString(row.am_steps_completed),
        arrToString(row.pm_steps_completed),
        String(row.skin_score ?? ''),
        row.breakouts ?? '',
        arrToString(row.breakout_locations),
        row.dryness ?? '',
        row.oiliness ?? '',
        row.sensitivity ?? '',
        row.texture ?? '',
        row.testing_product ?? '',
        row.test_reaction ?? '',
        String(row.test_day ?? ''),
        String(row.cycle_day ?? ''),
        row.notes ?? '',
      ]);

      // ============================================
      // SECTION 12: Calf Measurements
      // ============================================
      const calfHeaders = ['Date', 'Left Calf (cm)', 'Right Calf (cm)', 'Ankle Flexion (°)', 'Notes'];
      const calfRows = (calfMeasurements.data ?? []).map((row: any) => [
        row.measure_date,
        String(row.left_calf_cm),
        String(row.right_calf_cm),
        String(row.ankle_flexion_degrees ?? ''),
        row.notes ?? '',
      ]);

      // ============================================
      // SECTION 13: Saved Meals
      // ============================================
      const savedMealHeaders = ['Name', 'Description', 'Meal Type', 'Calories', 'Protein', 'Carbs', 'Fat', 'Fiber', 'Source', 'Serving Size', 'Serving Unit', 'Times Used', 'Favorite'];
      const savedMealRows = (savedMeals.data ?? []).map((row: any) => [
        row.name ?? '',
        row.description ?? '',
        row.meal_type ?? '',
        String(row.calories ?? ''),
        String(row.protein ?? ''),
        String(row.carbs ?? ''),
        String(row.fat ?? ''),
        String(row.fiber ?? ''),
        row.source ?? '',
        String(row.serving_size ?? ''),
        row.serving_unit ?? '',
        String(row.use_count ?? 0),
        boolToYesNo(row.is_favorite),
      ]);

      // ============================================
      // SECTION 14: Health Labs
      // ============================================
      const labHeaders = ['Test Date', 'Test Name', 'Value', 'Unit', 'Ref Low', 'Ref High', 'Flagged', 'Notes'];
      const labRows = (healthLabs.data ?? []).map((row: any) => [
        row.test_date,
        row.test_name,
        String(row.value),
        row.unit ?? '',
        String(row.reference_range_low ?? ''),
        String(row.reference_range_high ?? ''),
        boolToYesNo(row.is_flagged),
        row.notes ?? '',
      ]);

      // ============================================
      // Combine all sections into one multi-section CSV
      // ============================================
      const sections: { title: string; headers: string[]; rows: string[][] }[] = [
        { title: 'DAILY SUMMARY', headers: summaryHeaders, rows: summaryRows },
        { title: 'FOOD LOGS', headers: foodHeaders, rows: foodRows },
        { title: 'WATER LOGS', headers: waterHeaders, rows: waterRows },
        { title: 'SUPPLEMENT LOGS', headers: supplementHeaders, rows: supplementRows },
        { title: 'MY SUPPLEMENTS', headers: userSuppHeaders, rows: userSuppRows },
        { title: 'EXERCISE LOGS', headers: exerciseHeaders, rows: exerciseRows },
        { title: 'WEIGHT LOGS', headers: weightHeaders, rows: weightRows },
        { title: 'SYMPTOMS', headers: symptomHeaders, rows: symptomRows },
        { title: 'PERIOD LOGS', headers: periodHeaders, rows: periodRows },
        { title: 'SKIN PHOTOS', headers: skinPhotoHeaders, rows: skinPhotoRows },
        { title: 'SKINCARE LOGS', headers: skincareHeaders, rows: skincareRows },
        { title: 'CALF MEASUREMENTS', headers: calfHeaders, rows: calfRows },
        { title: 'SAVED MEALS', headers: savedMealHeaders, rows: savedMealRows },
        { title: 'HEALTH LABS', headers: labHeaders, rows: labRows },
      ];

      const csvParts: string[] = [];
      for (const section of sections) {
        csvParts.push(`\n--- ${section.title} ---`);
        csvParts.push(toCSV(section.headers, section.rows));
      }

      const csv = csvParts.join('\n\n');
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
