import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { toDateKey } from '../utils/storage';

/**
 * The 5 sheet keys exposed by the May 7 export overhaul.
 * Defaults: all five selected. Export window: last 90 days.
 */
export const EXPORT_SHEETS: Array<{ key: ExportSheetKey; label: string }> = [
  { key: 'daily', label: 'Daily Log' },
  { key: 'food', label: 'Food Logs' },
  { key: 'skincare', label: 'Skincare' },
  { key: 'supplements', label: 'Supplements' },
  { key: 'labs', label: 'Health Labs' },
];

export type ExportSheetKey =
  | 'daily'
  | 'food'
  | 'skincare'
  | 'supplements'
  | 'labs';

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
  const [selectedSheets, setSelectedSheets] = useState<Set<ExportSheetKey>>(
    () => new Set<ExportSheetKey>(['daily', 'food', 'skincare', 'supplements', 'labs']),
  );

  const toggleSheet = useCallback((key: ExportSheetKey) => {
    setSelectedSheets((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const exportData = useCallback(async () => {
    if (!userId) {
      setError('Not logged in');
      return;
    }
    if (selectedSheets.size === 0) {
      setError('Select at least one sheet');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // 90-day window (May 7 export overhaul).
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const startDate = toDateKey(ninetyDaysAgo);
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
        'Love',
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
        // Extract love from health_notes JSON
        if (row.health_notes) {
          try {
            const hn = JSON.parse(row.health_notes);
            if (typeof hn === 'object' && hn !== null && hn.love) {
              r['Love'] = 'Yes';
            }
          } catch {
            // not JSON
          }
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
      // Combine selected sections into one multi-section CSV
      // ============================================
      // The May 7 export overhaul groups the 14 baseline tabs into 5 user-selectable
      // sheets: daily (combined daily log + water/symptoms/exercise/period/calf),
      // food, skincare (skincare logs + skin photos), supplements (user supplements +
      // taken logs), labs (health labs).
      type Section = { title: string; headers: string[]; rows: string[][] };
      const sectionsByKey: Record<ExportSheetKey, Section[]> = {
        daily: [
          { title: 'DAILY SUMMARY', headers: summaryHeaders, rows: summaryRows },
          { title: 'WATER LOGS', headers: waterHeaders, rows: waterRows },
          { title: 'EXERCISE LOGS', headers: exerciseHeaders, rows: exerciseRows },
          { title: 'WEIGHT LOGS', headers: weightHeaders, rows: weightRows },
          { title: 'SYMPTOMS', headers: symptomHeaders, rows: symptomRows },
          { title: 'PERIOD LOGS', headers: periodHeaders, rows: periodRows },
          { title: 'CALF MEASUREMENTS', headers: calfHeaders, rows: calfRows },
        ],
        food: [
          { title: 'FOOD LOGS', headers: foodHeaders, rows: foodRows },
          { title: 'SAVED MEALS', headers: savedMealHeaders, rows: savedMealRows },
        ],
        skincare: [
          { title: 'SKINCARE LOGS', headers: skincareHeaders, rows: skincareRows },
          { title: 'SKIN PHOTOS', headers: skinPhotoHeaders, rows: skinPhotoRows },
        ],
        supplements: [
          { title: 'MY SUPPLEMENTS', headers: userSuppHeaders, rows: userSuppRows },
          { title: 'SUPPLEMENT LOGS', headers: supplementHeaders, rows: supplementRows },
        ],
        labs: [{ title: 'HEALTH LABS', headers: labHeaders, rows: labRows }],
      };

      const sections: Section[] = [];
      for (const { key } of EXPORT_SHEETS) {
        if (selectedSheets.has(key)) sections.push(...sectionsByKey[key]);
      }

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
  }, [userId, selectedSheets]);

  const exportDashboard = useCallback(async () => {
    if (!userId) {
      setError('Not logged in');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const startDate = toDateKey(ninetyDaysAgo);
      const endDate = toDateKey(new Date());

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;

      const [
        dailyLogs,
        foodLogs,
        weightLogs,
        waterLogs,
        symptoms,
        supplementLogs,
        userSupplements,
        exerciseLogs,
        periodLogs,
        skincareLogs,
        profileResult,
      ] = await Promise.all([
        db.from('daily_logs')
          .select('log_date, mood, health_notes')
          .eq('user_id', userId)
          .gte('log_date', startDate)
          .lte('log_date', endDate)
          .order('log_date', { ascending: true }),
        db.from('food_logs')
          .select('log_date, calories, protein')
          .eq('user_id', userId)
          .gte('log_date', startDate)
          .lte('log_date', endDate)
          .order('log_date', { ascending: true }),
        db.from('weight_logs')
          .select('log_date, weight')
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
          .select('log_date, bloating, mood, energy_level, notes')
          .eq('user_id', userId)
          .gte('log_date', startDate)
          .lte('log_date', endDate)
          .order('log_date', { ascending: true }),
        db.from('supplement_logs')
          .select('log_date, user_supplement_id, taken')
          .eq('user_id', userId)
          .gte('log_date', startDate)
          .lte('log_date', endDate)
          .order('log_date', { ascending: true }),
        db.from('user_supplements')
          .select('id, supplement_name, dosage, is_active')
          .eq('user_id', userId)
          .eq('is_active', true),
        db.from('exercise_logs')
          .select('log_date, exercise_type, duration_minutes, sleep_score')
          .eq('user_id', userId)
          .gte('log_date', startDate)
          .lte('log_date', endDate)
          .order('log_date', { ascending: true }),
        db.from('period_logs')
          .select('log_date, flow, cramps')
          .eq('user_id', userId)
          .gte('log_date', startDate)
          .lte('log_date', endDate)
          .order('log_date', { ascending: true }),
        db.from('skincare_logs')
          .select('log_date, skin_score, breakouts, cycle_day')
          .eq('user_id', userId)
          .gte('log_date', startDate)
          .lte('log_date', endDate)
          .order('log_date', { ascending: true }),
        db.from('profiles')
          .select('calorie_target, protein_target, water_target')
          .eq('id', userId)
          .single(),
      ]);

      const calorieTarget = profileResult.data?.calorie_target ?? 1800;
      const proteinTarget = profileResult.data?.protein_target ?? 50;
      const waterTarget = profileResult.data?.water_target ?? 8;
      const totalActiveSupplements = (userSupplements.data ?? []).length;

      // Build supplement name lookup and identify key supplements for individual columns
      const KEY_SUPPLEMENT_NAMES = ['Inositol', 'Metformin', 'NAC', 'Omega', 'Magnesium', 'Fiber'];

      const suppIdToName: Record<string, string> = {};
      const suppIdToDosage: Record<string, string> = {};
      for (const s of userSupplements.data ?? []) {
        suppIdToName[s.id] = s.supplement_name;
        suppIdToDosage[s.id] = s.dosage ?? '';
      }

      // Match supplement IDs to key columns (case-insensitive partial match)
      const keySuppIds: Record<string, string[]> = {};
      for (const keyName of KEY_SUPPLEMENT_NAMES) {
        keySuppIds[keyName] = [];
      }
      for (const s of userSupplements.data ?? []) {
        const name = (s.supplement_name ?? '').toLowerCase();
        for (const keyName of KEY_SUPPLEMENT_NAMES) {
          if (name.includes(keyName.toLowerCase())) {
            keySuppIds[keyName].push(s.id);
          }
        }
      }

      // Build flat day map
      interface DayData {
        mood: string;
        energy: string;
        calories: number;
        protein: number;
        water: number;
        suppsTaken: number;
        suppsTotal: number;
        keySupps: Record<string, string>; // key supplement name -> dosage taken
        otherSuppsTaken: number;
        otherSuppsTotal: number;
        exercise: string;
        skinScore: string;
        breakouts: string;
        flow: string;
        cramps: string;
        bloating: string;
        weight: string;
        love: string;
        sleep: string;
        cycleDay: string;
        notes: string;
      }

      // Track which supplement IDs are "key" (used in named columns)
      const allKeySuppIds = new Set<string>();
      for (const ids of Object.values(keySuppIds)) {
        for (const id of ids) allKeySuppIds.add(id);
      }
      const otherSuppsTotal = totalActiveSupplements - allKeySuppIds.size;

      const dayMap: Record<string, DayData> = {};
      const ensureDay = (d: string): DayData => {
        if (!dayMap[d]) {
          dayMap[d] = {
            mood: '', energy: '', calories: 0, protein: 0,
            water: 0, suppsTaken: 0, suppsTotal: totalActiveSupplements,
            keySupps: {}, otherSuppsTaken: 0, otherSuppsTotal: otherSuppsTotal,
            exercise: '', skinScore: '', breakouts: '', flow: '',
            cramps: '', bloating: '', weight: '', love: '',
            sleep: '', cycleDay: '', notes: '',
          };
        }
        return dayMap[d];
      };

      // Daily logs -> mood, energy, love, notes
      for (const row of dailyLogs.data ?? []) {
        const day = ensureDay(row.log_date);
        try {
          const parsed = JSON.parse(row.mood ?? '{}');
          day.mood = String(parsed.mood ?? '');
          day.energy = String(parsed.energy ?? '');
        } catch {
          day.mood = row.mood ?? '';
        }
        if (row.health_notes) {
          try {
            const hn = JSON.parse(row.health_notes);
            if (typeof hn === 'object' && hn !== null && hn.love) {
              day.love = 'Yes';
            }
          } catch {
            // not JSON
          }
          const formatted = formatHealthNotes(row.health_notes);
          day.notes = formatted.length > 50 ? formatted.slice(0, 47) + '...' : formatted;
        }
      }

      // Food -> calories, protein
      for (const row of foodLogs.data ?? []) {
        const day = ensureDay(row.log_date);
        day.calories += row.calories ?? 0;
        day.protein += Number(row.protein ?? 0);
      }

      // Weight
      for (const row of weightLogs.data ?? []) {
        ensureDay(row.log_date).weight = String(row.weight);
      }

      // Water
      for (const row of waterLogs.data ?? []) {
        ensureDay(row.log_date).water = row.glasses ?? 0;
      }

      // Symptoms -> bloating, mood/energy override if not from daily_logs
      for (const row of symptoms.data ?? []) {
        const day = ensureDay(row.log_date);
        day.bloating = row.bloating ? String(row.bloating) : '';
        if (!day.mood && row.mood) day.mood = String(row.mood);
        if (!day.energy && row.energy_level) day.energy = String(row.energy_level);
      }

      // Supplements -> categorize into key supplement columns and other
      const suppsByDay: Record<string, number> = {};
      const otherSuppsByDay: Record<string, number> = {};
      for (const row of supplementLogs.data ?? []) {
        const day = ensureDay(row.log_date);
        if (row.taken) {
          suppsByDay[row.log_date] = (suppsByDay[row.log_date] ?? 0) + 1;

          const suppId = row.user_supplement_id;
          let isKey = false;
          for (const [keyName, ids] of Object.entries(keySuppIds)) {
            if (ids.includes(suppId)) {
              // Use the supplement name + dosage for the column value
              const name = suppIdToName[suppId] ?? keyName;
              const dosage = suppIdToDosage[suppId] ?? '';
              const existing = day.keySupps[keyName];
              day.keySupps[keyName] = existing
                ? `${existing}, ${dosage || name}`
                : (dosage || name);
              isKey = true;
            }
          }
          if (!isKey) {
            otherSuppsByDay[row.log_date] = (otherSuppsByDay[row.log_date] ?? 0) + 1;
          }
        }
      }
      for (const [date, count] of Object.entries(suppsByDay)) {
        dayMap[date]!.suppsTaken = count;
      }
      for (const [date, count] of Object.entries(otherSuppsByDay)) {
        dayMap[date]!.otherSuppsTaken = count;
      }

      // Exercise -> type + duration (first entry per day)
      const exerciseByDay: Record<string, string[]> = {};
      for (const row of exerciseLogs.data ?? []) {
        const day = ensureDay(row.log_date);
        if (!exerciseByDay[row.log_date]) exerciseByDay[row.log_date] = [];
        const typeName = (row.exercise_type ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
        const dur = row.duration_minutes ? ` ${row.duration_minutes}min` : '';
        exerciseByDay[row.log_date].push(`${typeName}${dur}`);
        if (row.sleep_score) day.sleep = String(row.sleep_score);
      }
      for (const [date, entries] of Object.entries(exerciseByDay)) {
        dayMap[date]!.exercise = entries.join(', ');
      }

      // Period -> flow, cramps
      for (const row of periodLogs.data ?? []) {
        const day = ensureDay(row.log_date);
        day.flow = row.flow ?? '';
        day.cramps = row.cramps ? String(row.cramps) : '';
      }

      // Skincare -> skin score, breakouts, cycle day
      for (const row of skincareLogs.data ?? []) {
        const day = ensureDay(row.log_date);
        if (row.skin_score != null) day.skinScore = String(row.skin_score);
        if (row.breakouts) day.breakouts = row.breakouts;
        if (row.cycle_day != null) day.cycleDay = String(row.cycle_day);
      }

      // Build CSV rows sorted by date
      const headers = [
        'Date', 'Day', 'Mood', 'Energy', 'Calories', 'Protein',
        'Water',
        ...KEY_SUPPLEMENT_NAMES,
        'Other Supps',
        'Exercise', 'Skin Score', 'Breakouts',
        'Period', 'Cramps', 'Stomach', 'Weight', 'Love', 'Sleep', 'Notes',
      ];

      const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      const sortedDates = Object.keys(dayMap).sort();
      const rows = sortedDates.map((dateStr) => {
        const d = dayMap[dateStr];
        const dateObj = new Date(dateStr + 'T00:00:00');
        const formattedDate = `${DAY_NAMES[dateObj.getDay()]} ${MONTH_NAMES[dateObj.getMonth()]} ${dateObj.getDate()}`;

        const calStr = d.calories > 0 ? `${Math.round(d.calories)}/${calorieTarget}` : '';
        const protStr = d.protein > 0 ? `${Math.round(d.protein)}/${proteinTarget}g` : '';
        const waterStr = d.water > 0 ? `${d.water}/${waterTarget}` : '';
        const otherSuppStr = d.otherSuppsTaken > 0 || d.otherSuppsTotal > 0
          ? `${d.otherSuppsTaken}/${d.otherSuppsTotal}`
          : '';

        return [
          formattedDate,
          d.cycleDay,
          d.mood,
          d.energy,
          calStr,
          protStr,
          waterStr,
          ...KEY_SUPPLEMENT_NAMES.map((keyName) => d.keySupps[keyName] ?? ''),
          otherSuppStr,
          d.exercise,
          d.skinScore,
          d.breakouts,
          d.flow,
          d.cramps,
          d.bloating,
          d.weight,
          d.love,
          d.sleep,
          d.notes,
        ];
      });

      const csv = toCSV(headers, rows);
      const filename = `healthy-me-dashboard-${endDate}.csv`;
      downloadCSV(filename, csv);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message ?? 'Export failed');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return {
    loading,
    error,
    success,
    exportData,
    exportDashboard,
    selectedSheets,
    toggleSheet,
  };
}
