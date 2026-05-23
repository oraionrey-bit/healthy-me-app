import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

interface MealSuggestion {
  name: string;
  description: string;
  calories: number;
  protein: number;
  emoji: string;
  /** Optional cuisine tags for filtering */
  cuisines?: string[];
}

interface HealthTip {
  text: string;
  emoji: string;
}

const HIGH_PROTEIN_MEALS: MealSuggestion[] = [
  { name: 'Greek Yogurt Bowl', description: 'Greek yogurt with berries and nuts', calories: 250, protein: 20, emoji: '🥣' },
  { name: 'Grilled Chicken Breast', description: 'Grilled chicken breast with veggies', calories: 300, protein: 35, emoji: '🍗', cuisines: ['American'] },
  { name: 'Scrambled Eggs', description: '3 scrambled eggs with spinach', calories: 280, protein: 22, emoji: '🥚' },
  { name: 'Edamame Bowl', description: 'Steamed edamame with sea salt', calories: 190, protein: 18, emoji: '🫛', cuisines: ['Japanese'] },
  { name: 'Tuna Salad', description: 'Tuna salad on greens', calories: 250, protein: 30, emoji: '🐟' },
  { name: 'Grilled Fish', description: 'Grilled salmon or white fish', calories: 320, protein: 35, emoji: '🐠' },
];

const BALANCED_MEALS: MealSuggestion[] = [
  { name: 'Salmon & Veggies', description: 'Baked salmon with roasted vegetables', calories: 450, protein: 35, emoji: '🐟' },
  { name: 'Chicken Stir-Fry', description: 'Chicken stir-fry with mixed vegetables', calories: 400, protein: 30, emoji: '🥘' },
  { name: 'Lentil Soup', description: 'Hearty lentil soup with herbs', calories: 350, protein: 20, emoji: '🥣' },
  { name: 'Bibimbap', description: 'Mixed rice bowl with veggies and egg', calories: 420, protein: 25, emoji: '🍚', cuisines: ['Korean'] },
  { name: 'Kimchi Jjigae', description: 'Kimchi stew with tofu and pork', calories: 380, protein: 28, emoji: '🍲', cuisines: ['Korean'] },
  { name: 'Chicken Burrito Bowl', description: 'Rice, beans, chicken, salsa, guac', calories: 500, protein: 35, emoji: '🌯', cuisines: ['Mexican'] },
  { name: 'Pasta Primavera', description: 'Pasta with seasonal vegetables', calories: 420, protein: 15, emoji: '🍝', cuisines: ['Italian'] },
  { name: 'Teriyaki Salmon Bowl', description: 'Salmon over rice with teriyaki glaze', calories: 480, protein: 32, emoji: '🍣', cuisines: ['Japanese'] },
];

const LIGHT_SNACKS: MealSuggestion[] = [
  { name: 'Almonds', description: 'A handful of almonds (about 23)', calories: 160, protein: 6, emoji: '🥜' },
  { name: 'Protein Bar', description: 'Low-sugar protein bar', calories: 200, protein: 20, emoji: '🍫' },
  { name: 'Boiled Eggs', description: '2 hard-boiled eggs', calories: 140, protein: 12, emoji: '🥚' },
  { name: 'Cottage Cheese', description: 'Cottage cheese with cucumber', calories: 120, protein: 14, emoji: '🧀' },
  { name: 'Protein Shake', description: 'Whey protein shake with almond milk', calories: 180, protein: 25, emoji: '🥤' },
];

const PCOS_TIPS: HealthTip[] = [
  { text: 'Pairing protein with every meal helps stabilize blood sugar — great for PCOS!', emoji: '💪' },
  { text: 'Anti-inflammatory foods like salmon and leafy greens can help reduce PCOS symptoms.', emoji: '🌿' },
  { text: 'Eating at regular intervals helps maintain steady insulin levels.', emoji: '⏰' },
  { text: 'Complex carbs with fiber are better than refined carbs for insulin sensitivity.', emoji: '🌾' },
  { text: 'Omega-3 rich foods can help reduce inflammation associated with PCOS.', emoji: '🐟' },
  { text: 'Cinnamon may help improve insulin sensitivity — try adding it to your meals!', emoji: '✨' },
  { text: 'Staying hydrated helps your body process nutrients more efficiently.', emoji: '💧' },
  { text: 'Mindful eating can reduce cortisol levels, which affects PCOS hormones.', emoji: '🧘' },
];

const GENERAL_TIPS: HealthTip[] = [
  { text: 'Pairing protein with every meal helps keep you full and supports muscle health.', emoji: '💪' },
  { text: 'Colorful plates mean diverse nutrients — aim for 5 different colors daily.', emoji: '🌈' },
  { text: 'Eating at regular intervals helps maintain steady energy levels.', emoji: '⏰' },
  { text: 'Whole grains and fiber keep you satisfied longer and support gut health.', emoji: '🌾' },
  { text: 'Staying hydrated helps your body process nutrients more efficiently.', emoji: '💧' },
  { text: 'Mindful eating helps you enjoy food more and recognize fullness cues.', emoji: '🧘' },
  { text: 'Lean proteins like fish, chicken, and legumes are great for balanced meals.', emoji: '🐟' },
  { text: 'Consistent meal timing can help regulate your metabolism.', emoji: '✨' },
];

function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

/** Filter meals to prefer user's cuisine preferences */
function filterByCuisine(meals: MealSuggestion[], cuisinePrefs: string[]): MealSuggestion[] {
  if (cuisinePrefs.length === 0) return meals;
  // Score meals: prefer ones that match user cuisine prefs, then generic (no cuisine tag)
  const scored = meals.map((m) => {
    if (!m.cuisines || m.cuisines.length === 0) return { meal: m, score: 1 }; // generic = neutral
    const matches = m.cuisines.some((c) => cuisinePrefs.includes(c));
    return { meal: m, score: matches ? 2 : 0 };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.meal);
}

function getSuggestions(
  remainingCalories: number,
  remainingProtein: number,
  isPcos: boolean,
  cuisinePrefs: string[],
): { meals: MealSuggestion[]; message: string; tip: HealthTip } {
  const timeOfDay = getTimeOfDay();
  const tips = isPcos ? PCOS_TIPS : GENERAL_TIPS;
  const tipIndex = new Date().getDate() % tips.length;
  const tip = tips[tipIndex];

  // On track — nearly met targets
  if (remainingCalories < 200 && remainingProtein <= 10) {
    return {
      meals: LIGHT_SNACKS.slice(0, 2),
      message: "You're almost there! Maybe just a light snack if you're hungry.",
      tip,
    };
  }

  // Low calories remaining — suggest light snacks
  if (remainingCalories < 400) {
    const snacks = LIGHT_SNACKS.filter((s) => s.calories <= remainingCalories + 50);
    return {
      meals: snacks.length > 0 ? snacks.slice(0, 3) : LIGHT_SNACKS.slice(0, 2),
      message: 'Light options to finish the day strong 💪',
      tip,
    };
  }

  // Evening + protein needed → protein-rich dinner
  if (timeOfDay === 'evening' && remainingProtein > 20) {
    const dinnerOptions = filterByCuisine(
      [...HIGH_PROTEIN_MEALS, ...BALANCED_MEALS].filter((m) => m.protein >= 20),
      cuisinePrefs,
    ).sort((a, b) => b.protein - a.protein);
    return {
      meals: dinnerOptions.slice(0, 3),
      message: "Let's get that protein in before bed! 🌙",
      tip,
    };
  }

  // High protein remaining → high-protein meals
  if (remainingProtein > 30) {
    return {
      meals: filterByCuisine(HIGH_PROTEIN_MEALS, cuisinePrefs).slice(0, 3),
      message: 'Protein-packed options to hit your target! 🎯',
      tip,
    };
  }

  // Balanced — plenty of both remaining
  const pool = timeOfDay === 'morning'
    ? BALANCED_MEALS
    : [...BALANCED_MEALS, ...HIGH_PROTEIN_MEALS];
  const options = filterByCuisine(pool, cuisinePrefs).slice(0, 3);

  return {
    meals: options,
    message: isPcos ? 'Here are some PCOS-friendly meal ideas ✨' : 'Here are some balanced meal ideas ✨',
    tip,
  };
}

interface MealSuggestionsProps {
  calorieTarget: number;
  proteinTarget: number;
  caloriesConsumed: number;
  proteinConsumed: number;
  onSelectMeal: (description: string) => void;
  isPcos?: boolean;
  cuisinePreferences?: string[];
}

export function MealSuggestions({
  calorieTarget,
  proteinTarget,
  caloriesConsumed,
  proteinConsumed,
  onSelectMeal,
  isPcos = true,
  cuisinePreferences = [],
}: MealSuggestionsProps) {
  const remainingCalories = Math.max(calorieTarget - caloriesConsumed, 0);
  const remainingProtein = Math.max(proteinTarget - proteinConsumed, 0);

  const targetsMetCal = caloriesConsumed >= calorieTarget;
  const targetsMetProtein = proteinConsumed >= proteinTarget;
  const allTargetsMet = targetsMetCal && targetsMetProtein;

  const { meals, message, tip } = useMemo(
    () => getSuggestions(remainingCalories, remainingProtein, isPcos, cuisinePreferences),
    [remainingCalories, remainingProtein, isPcos, cuisinePreferences],
  );

  if (allTargetsMet) {
    return (
      <View style={styles.card}>
        <Text style={styles.celebrateText}>🎉 You hit your targets!</Text>
        <Text style={styles.celebrateSub}>
          Amazing job today! Keep up the great work 💜
        </Text>
      </View>
    );
  }

  // Don't show if no food logged yet
  if (caloriesConsumed === 0 && proteinConsumed === 0) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>🤖 What should I eat next?</Text>
      <Text style={styles.message}>{message}</Text>

      <View style={styles.remaining}>
        <Text style={styles.remainingText}>
          {remainingCalories} cal · {remainingProtein}g protein remaining
        </Text>
      </View>

      <View style={styles.mealList}>
        {meals.map((meal, idx) => (
          <TouchableOpacity
            key={`${meal.name}-${idx}`}
            style={styles.mealItem}
            onPress={() => onSelectMeal(meal.description)}
            activeOpacity={0.7}
          >
            <Text style={styles.mealEmoji}>{meal.emoji}</Text>
            <View style={styles.mealContent}>
              <Text style={styles.mealName}>{meal.name}</Text>
              <Text style={styles.mealMacros}>
                ~{meal.calories} cal · {meal.protein}g protein
              </Text>
            </View>
            <Text style={styles.mealArrow}>→</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.tipBox}>
        <Text style={styles.tipText}>
          {tip.emoji} {tip.text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(124, 77, 255, 0.08)',
      },
      default: {
        shadowColor: '#7c4dff',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  title: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.purple,
    marginBottom: Spacing.xs,
  },
  message: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  remaining: {
    backgroundColor: Colors.softPurple,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  remainingText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.purple,
  },
  mealList: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  mealEmoji: {
    fontSize: 24,
  },
  mealContent: {
    flex: 1,
  },
  mealName: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
  },
  mealMacros: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  mealArrow: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.purple,
  },
  tipBox: {
    backgroundColor: Colors.cream,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  tipText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  celebrateText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.success,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  celebrateSub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
