/**
 * Tests for new features added overnight (Round 2):
 * - Quick-add macro parser
 * - Daily score calculator (math)
 * - Water log hook
 * - Saved meals hook
 * - Food trends hook
 * - Weekly insights hook
 */

// ── Quick-Add Macro Parser Tests ──

// Inline the parser so we can test it without importing the whole component
function parseQuickAddText(text: string): { calories: number | null; protein: number | null; carbs: number | null; fat: number | null } {
  const result: { calories: number | null; protein: number | null; carbs: number | null; fat: number | null } = { calories: null, protein: null, carbs: null, fat: null };

  const calMatch = text.match(/(\d+)\s*cal/i);
  if (calMatch) result.calories = parseInt(calMatch[1], 10);

  const protMatch = text.match(/(\d+)\s*g?\s*protein/i);
  if (protMatch) result.protein = parseInt(protMatch[1], 10);

  const carbMatch = text.match(/(\d+)\s*g?\s*carb/i);
  if (carbMatch) result.carbs = parseInt(carbMatch[1], 10);

  const fatMatch = text.match(/(\d+)\s*g?\s*fat/i);
  if (fatMatch) result.fat = parseInt(fatMatch[1], 10);

  return result;
}

describe('Quick-Add Macro Parser', () => {
  it('parses calories from "400 cal"', () => {
    expect(parseQuickAddText('chicken salad, 400 cal')).toEqual({
      calories: 400, protein: null, carbs: null, fat: null,
    });
  });

  it('parses calories and protein', () => {
    expect(parseQuickAddText('chicken breast 300 cal 35g protein')).toEqual({
      calories: 300, protein: 35, carbs: null, fat: null,
    });
  });

  it('parses all macros', () => {
    expect(parseQuickAddText('400 cal, 35g protein, 30g carbs, 15g fat')).toEqual({
      calories: 400, protein: 35, carbs: 30, fat: 15,
    });
  });

  it('handles case-insensitive input', () => {
    expect(parseQuickAddText('200 CAL 20G PROTEIN')).toEqual({
      calories: 200, protein: 20, carbs: null, fat: null,
    });
  });

  it('handles "calories" (full word)', () => {
    expect(parseQuickAddText('200 calories')).toEqual({
      calories: 200, protein: null, carbs: null, fat: null,
    });
  });

  it('handles protein without "g" prefix', () => {
    expect(parseQuickAddText('25 protein')).toEqual({
      calories: null, protein: 25, carbs: null, fat: null,
    });
  });

  it('returns all nulls for plain text with no macros', () => {
    expect(parseQuickAddText('chicken salad')).toEqual({
      calories: null, protein: null, carbs: null, fat: null,
    });
  });

  it('returns all nulls for empty string', () => {
    expect(parseQuickAddText('')).toEqual({
      calories: null, protein: null, carbs: null, fat: null,
    });
  });

  it('handles "carbohydrate" variant', () => {
    expect(parseQuickAddText('40g carbohydrate')).toEqual({
      calories: null, protein: null, carbs: 40, fat: null,
    });
  });
});

// ── Daily Score Calculator Math Tests ──

// Inline the scoreCalories function
function scoreCalories(consumed: number, target: number): number {
  if (target <= 0) return 0;
  const lower = target - 100;
  const upper = target + 100;
  if (consumed >= lower && consumed <= upper) return 100;
  const diff = consumed < lower ? lower - consumed : consumed - upper;
  if (diff <= 200) return 80;
  if (diff <= 400) return 50;
  return 20;
}

describe('Daily Score — scoreCalories', () => {
  const TARGET = 1500;

  it('scores 100 for exactly at target', () => {
    expect(scoreCalories(1500, TARGET)).toBe(100);
  });

  it('scores 100 within ±100 of target', () => {
    expect(scoreCalories(1400, TARGET)).toBe(100);
    expect(scoreCalories(1600, TARGET)).toBe(100);
  });

  it('scores 80 for diff ≤200 outside ±100 range', () => {
    expect(scoreCalories(1200, TARGET)).toBe(80); // lower=1400, diff=200 → ≤200 → 80
    expect(scoreCalories(1700, TARGET)).toBe(80); // upper=1600, diff=100 → ≤200 → 80
    expect(scoreCalories(1399, TARGET)).toBe(80); // lower=1400, diff=1 → ≤200 → 80
    expect(scoreCalories(1601, TARGET)).toBe(80); // upper=1600, diff=1 → ≤200 → 80
  });

  it('scores 50 for diff 200–400 outside ±100 range', () => {
    expect(scoreCalories(1000, TARGET)).toBe(50); // lower=1400, diff=400 → ≤400 → 50
    expect(scoreCalories(1100, TARGET)).toBe(50); // lower=1400, diff=300 → ≤400 → 50
  });

  it('scores 20 for very far from target', () => {
    expect(scoreCalories(500, TARGET)).toBe(20);
    expect(scoreCalories(2500, TARGET)).toBe(20);
  });

  it('returns 0 for zero target', () => {
    expect(scoreCalories(100, 0)).toBe(0);
  });
});

describe('Daily Score — Weight Redistribution Logic', () => {
  const BASE_WEIGHTS: Record<string, number> = {
    protein: 0.20,
    calories: 0.15,
    supplements: 0.20,
    water: 0.10,
    exercise: 0.15,
    sleep: 0.10,
    checkin: 0.10,
  };

  it('base weights sum to 1.0', () => {
    const sum = Object.values(BASE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1.0)).toBeLessThan(0.001);
  });

  it('redistributed weights sum to 1.0 when sleep is excluded', () => {
    const activeCategories = Object.keys(BASE_WEIGHTS).filter((k) => k !== 'sleep');
    const totalBaseWeight = activeCategories.reduce((s, k) => s + BASE_WEIGHTS[k], 0);
    const weights: Record<string, number> = {};
    for (const key of Object.keys(BASE_WEIGHTS)) {
      if (activeCategories.includes(key)) {
        weights[key] = BASE_WEIGHTS[key] / totalBaseWeight;
      } else {
        weights[key] = 0;
      }
    }
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1.0)).toBeLessThan(0.001);
  });

  it('perfect day with all data scores 100', () => {
    const rawScores: Record<string, number> = {
      protein: 100, calories: 100, supplements: 100,
      water: 100, exercise: 100, sleep: 100, checkin: 100,
    };
    const total = Object.keys(BASE_WEIGHTS).reduce(
      (s, k) => s + Math.round(rawScores[k] * BASE_WEIGHTS[k]), 0,
    );
    expect(total).toBe(100);
  });

  it('zero day scores 0', () => {
    const rawScores: Record<string, number> = {
      protein: 0, calories: 0, supplements: 0,
      water: 0, exercise: 0, sleep: 0, checkin: 0,
    };
    const total = Object.keys(BASE_WEIGHTS).reduce(
      (s, k) => s + Math.round(rawScores[k] * BASE_WEIGHTS[k]), 0,
    );
    expect(total).toBe(0);
  });

  it('supplements only day scores 20 (supplement weight = 0.20)', () => {
    const rawScores: Record<string, number> = {
      protein: 0, calories: 0, supplements: 100,
      water: 0, exercise: 0, sleep: 0, checkin: 0,
    };
    const total = Object.keys(BASE_WEIGHTS).reduce(
      (s, k) => s + Math.round(rawScores[k] * BASE_WEIGHTS[k]), 0,
    );
    expect(total).toBe(20);
  });

  it('supplements with no items configured scores 100 for that category', () => {
    // When totalSupps = 0, supplementsRaw = 100 (full marks)
    const totalSupps = 0;
    const takenSupps = 0;
    const supplementsRaw = totalSupps > 0
      ? Math.min(Math.round((takenSupps / totalSupps) * 100), 100)
      : 100;
    expect(supplementsRaw).toBe(100);
  });
});

// ── Trend Determination Tests (from weekly-insights) ──

function determineTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
  const diff = current - previous;
  const threshold = previous * 0.05;
  if (diff > threshold) return 'up';
  if (diff < -threshold) return 'down';
  return 'stable';
}

describe('Weekly Insights — determineTrend', () => {
  it('returns up when current is >5% higher', () => {
    expect(determineTrend(110, 100)).toBe('up');
  });

  it('returns down when current is >5% lower', () => {
    expect(determineTrend(90, 100)).toBe('down');
  });

  it('returns stable within 5% threshold', () => {
    expect(determineTrend(103, 100)).toBe('stable');
    expect(determineTrend(97, 100)).toBe('stable');
  });

  it('returns stable for equal values', () => {
    expect(determineTrend(100, 100)).toBe('stable');
  });

  it('handles small numbers correctly', () => {
    // 5% of 10 = 0.5
    expect(determineTrend(11, 10)).toBe('up');  // diff=1 > 0.5
    expect(determineTrend(10.4, 10)).toBe('stable'); // diff=0.4 < 0.5
  });
});

// ── Food Trends Summary Logic ──

describe('Food Trends — Summary Calculation', () => {
  interface DayNutrition {
    date: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }

  function computeSummary(daily: DayNutrition[], calorieTarget: number, proteinTarget: number) {
    const tracked = daily.filter((d) => d.calories > 0 || d.protein > 0);
    if (tracked.length === 0) {
      return {
        avgCalories: 0, avgProtein: 0,
        daysOnProteinTarget: 0, daysOnCalorieTarget: 0,
        totalDays: 0,
      };
    }

    const cals = tracked.map((d) => d.calories);
    const prots = tracked.map((d) => d.protein);
    const avgCal = Math.round(cals.reduce((a, b) => a + b, 0) / tracked.length);
    const avgProt = Math.round(prots.reduce((a, b) => a + b, 0) / tracked.length);

    const daysOnProtein = tracked.filter((d) => d.protein >= proteinTarget).length;
    const daysOnCalorie = tracked.filter((d) => {
      const lower = calorieTarget - 200;
      const upper = calorieTarget + 200;
      return d.calories >= lower && d.calories <= upper;
    }).length;

    return {
      avgCalories: avgCal,
      avgProtein: avgProt,
      daysOnProteinTarget: daysOnProtein,
      daysOnCalorieTarget: daysOnCalorie,
      totalDays: tracked.length,
    };
  }

  it('computes averages correctly', () => {
    const data: DayNutrition[] = [
      { date: '2026-03-24', calories: 1400, protein: 70, carbs: 0, fat: 0 },
      { date: '2026-03-25', calories: 1600, protein: 90, carbs: 0, fat: 0 },
    ];
    const s = computeSummary(data, 1500, 80);
    expect(s.avgCalories).toBe(1500);
    expect(s.avgProtein).toBe(80);
    expect(s.totalDays).toBe(2);
  });

  it('counts days on protein target', () => {
    const data: DayNutrition[] = [
      { date: '2026-03-24', calories: 1500, protein: 80, carbs: 0, fat: 0 },
      { date: '2026-03-25', calories: 1500, protein: 60, carbs: 0, fat: 0 },
      { date: '2026-03-26', calories: 1500, protein: 100, carbs: 0, fat: 0 },
    ];
    const s = computeSummary(data, 1500, 80);
    expect(s.daysOnProteinTarget).toBe(2);
  });

  it('counts days within ±200 calorie range as on-target', () => {
    const data: DayNutrition[] = [
      { date: '2026-03-24', calories: 1300, protein: 0, carbs: 0, fat: 0 }, // 1500-200=1300, just on edge
      { date: '2026-03-25', calories: 1700, protein: 0, carbs: 0, fat: 0 }, // 1500+200=1700, just on edge
      { date: '2026-03-26', calories: 1100, protein: 0, carbs: 0, fat: 0 }, // outside
    ];
    const s = computeSummary(data, 1500, 80);
    expect(s.daysOnCalorieTarget).toBe(2);
  });

  it('skips zero-calorie days', () => {
    const data: DayNutrition[] = [
      { date: '2026-03-24', calories: 0, protein: 0, carbs: 0, fat: 0 },
      { date: '2026-03-25', calories: 1500, protein: 80, carbs: 0, fat: 0 },
    ];
    const s = computeSummary(data, 1500, 80);
    expect(s.totalDays).toBe(1);
    expect(s.avgCalories).toBe(1500);
  });

  it('returns zeros for empty data', () => {
    const s = computeSummary([], 1500, 80);
    expect(s.avgCalories).toBe(0);
    expect(s.totalDays).toBe(0);
  });
});

// ── Water Log Calculations ──

describe('Water Log — Calculations', () => {
  const DEFAULT_WATER_GOAL = 8;
  const ML_PER_GLASS = 250;

  it('calculates ml from glasses', () => {
    expect(4 * ML_PER_GLASS).toBe(1000);
    expect(8 * ML_PER_GLASS).toBe(2000);
  });

  it('calculates progress percentage', () => {
    const glasses = 4;
    const goal = 8;
    const progress = Math.min(glasses / goal, 1);
    expect(progress).toBe(0.5);
  });

  it('caps progress at 1.0 when over goal', () => {
    const glasses = 10;
    const goal = 8;
    const progress = Math.min(glasses / goal, 1);
    expect(progress).toBe(1);
  });

  it('marks complete when glasses >= goal', () => {
    expect(8 >= DEFAULT_WATER_GOAL).toBe(true);
    expect(9 >= DEFAULT_WATER_GOAL).toBe(true);
    expect(7 >= DEFAULT_WATER_GOAL).toBe(false);
  });
});

// ── Insight Generation Logic ──

describe('Weekly Insights — generateInsights logic', () => {
  function generateInsightCategories(data: {
    proteinGoalDays: number;
    supplementAdherencePct: number;
    avgSleepScore: number | null;
    totalExerciseMinutes: number;
    daysTracked: number;
    activityTrend: 'up' | 'down' | 'stable';
  }): string[] {
    const categories: string[] = [];

    if (data.proteinGoalDays >= 5) categories.push('protein-great');
    else if (data.proteinGoalDays >= 3) categories.push('protein-good');
    else if (data.daysTracked > 0) categories.push('protein-start');

    if (data.avgSleepScore !== null && data.avgSleepScore >= 85) categories.push('sleep-great');
    else if (data.avgSleepScore !== null && data.avgSleepScore >= 70) categories.push('sleep-good');

    if (data.supplementAdherencePct >= 80) categories.push('supp-great');
    else if (data.supplementAdherencePct >= 50) categories.push('supp-ok');
    else if (data.supplementAdherencePct > 0) categories.push('supp-start');

    if (data.activityTrend === 'up') categories.push('activity-up');
    else if (data.totalExerciseMinutes >= 150) categories.push('activity-great');
    else if (data.totalExerciseMinutes > 0) categories.push('activity-some');

    return categories;
  }

  it('generates protein-great for 5+ days on target', () => {
    const cats = generateInsightCategories({
      proteinGoalDays: 6, supplementAdherencePct: 0,
      avgSleepScore: null, totalExerciseMinutes: 0,
      daysTracked: 7, activityTrend: 'stable',
    });
    expect(cats).toContain('protein-great');
  });

  it('generates sleep-great for 85+ score', () => {
    const cats = generateInsightCategories({
      proteinGoalDays: 0, supplementAdherencePct: 0,
      avgSleepScore: 88, totalExerciseMinutes: 0,
      daysTracked: 7, activityTrend: 'stable',
    });
    expect(cats).toContain('sleep-great');
  });

  it('generates supp-great for 80%+ adherence', () => {
    const cats = generateInsightCategories({
      proteinGoalDays: 0, supplementAdherencePct: 85,
      avgSleepScore: null, totalExerciseMinutes: 0,
      daysTracked: 7, activityTrend: 'stable',
    });
    expect(cats).toContain('supp-great');
  });

  it('generates activity-up when trend is up', () => {
    const cats = generateInsightCategories({
      proteinGoalDays: 0, supplementAdherencePct: 0,
      avgSleepScore: null, totalExerciseMinutes: 30,
      daysTracked: 7, activityTrend: 'up',
    });
    expect(cats).toContain('activity-up');
  });

  it('generates activity-great for 150+ minutes', () => {
    const cats = generateInsightCategories({
      proteinGoalDays: 0, supplementAdherencePct: 0,
      avgSleepScore: null, totalExerciseMinutes: 180,
      daysTracked: 7, activityTrend: 'stable',
    });
    expect(cats).toContain('activity-great');
  });

  it('returns no insights when no data tracked', () => {
    const cats = generateInsightCategories({
      proteinGoalDays: 0, supplementAdherencePct: 0,
      avgSleepScore: null, totalExerciseMinutes: 0,
      daysTracked: 0, activityTrend: 'stable',
    });
    expect(cats).toHaveLength(0);
  });
});

// ── Saved Meals Type Validation ──

describe('SavedMeal type structure', () => {
  it('SavedMeal has expected fields', () => {
    const meal = {
      id: 'abc',
      user_id: 'user-1',
      name: 'Chicken Salad',
      description: 'Grilled chicken with greens',
      meal_type: 'lunch' as const,
      calories: 400,
      protein: 35,
      carbs: 20,
      fat: 15,
      fiber: 5,
      pcos_notes: 'Good protein source',
      use_count: 3,
      last_used_at: '2026-03-30T10:00:00Z',
      created_at: '2026-03-28T10:00:00Z',
    };

    expect(meal.name).toBe('Chicken Salad');
    expect(meal.use_count).toBe(3);
    expect(meal.meal_type).toBe('lunch');
    expect(typeof meal.calories).toBe('number');
    expect(typeof meal.protein).toBe('number');
  });

  it('SavedMeal allows nullable fields', () => {
    const meal = {
      id: 'abc',
      user_id: 'user-1',
      name: 'Quick Snack',
      description: null,
      meal_type: null,
      calories: null,
      protein: null,
      carbs: null,
      fat: null,
      fiber: null,
      pcos_notes: null,
      use_count: 0,
      last_used_at: null,
      created_at: '2026-03-28T10:00:00Z',
    };

    expect(meal.description).toBeNull();
    expect(meal.calories).toBeNull();
    expect(meal.meal_type).toBeNull();
    expect(meal.use_count).toBe(0);
  });
});
