import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { PixelButton } from '../../components/ui';
import { OnboardingCard } from '../../components/onboarding/onboarding-card';
import { ProgressDots } from '../../components/onboarding/progress-dots';
import { PixelBackButton } from '../../components/onboarding/pixel-back-button';
import { useUserProfile } from '../../hooks/use-user-profile';

const CAL_MIN = 800;
const CAL_MAX = 3000;
const CAL_STEP = 50;
const PROTEIN_MIN = 30;
const PROTEIN_MAX = 250;
const PROTEIN_STEP = 5;

const DIETARY_OPTIONS = [
  'No restrictions',
  'Low carb',
  'Dairy-free',
  'Gluten-free',
  'Vegetarian',
  'Vegan',
] as const;

const CUISINE_OPTIONS = [
  'Korean',
  'Japanese',
  'American',
  'Mexican',
  'Italian',
  'Other',
] as const;

function Stepper({
  label,
  value,
  unit,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.stepperWrap}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperRow}>
        <TouchableOpacity
          style={[styles.stepperBtn, value <= min && styles.stepperBtnDisabled]}
          onPress={() => onChange(Math.max(min, value - step))}
          disabled={value <= min}
        >
          <Text style={styles.stepperBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.stepperValue}>
          {value} <Text style={styles.stepperUnit}>{unit}</Text>
        </Text>
        <TouchableOpacity
          style={[styles.stepperBtn, value >= max && styles.stepperBtnDisabled]}
          onPress={() => onChange(Math.min(max, value + step))}
          disabled={value >= max}
        >
          <Text style={styles.stepperBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CheckboxGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: readonly string[];
  selected: Set<string>;
  onToggle: (item: string) => void;
}) {
  return (
    <View style={styles.checkboxGroup}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.pillWrap}>
        {options.map((opt) => {
          const isSelected = selected.has(opt);
          return (
            <TouchableOpacity
              key={opt}
              onPress={() => onToggle(opt)}
              style={[styles.pill, isSelected && styles.pillActive]}
            >
              <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                {opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function GoalsScreen() {
  const { updateProfile, healthCondition } = useUserProfile();
  const isPcos = healthCondition === 'pcos';

  // Smart defaults based on health condition
  const defaultCalories = isPcos ? 1500 : 1800;
  const defaultProtein = isPcos ? 80 : 50;

  const [calories, setCalories] = useState(defaultCalories);
  const [protein, setProtein] = useState(defaultProtein);
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs');
  const [dietaryPrefs, setDietaryPrefs] = useState<Set<string>>(new Set());
  const [cuisinePrefs, setCuisinePrefs] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const toggleDietary = (item: string) => {
    setDietaryPrefs((prev) => {
      const next = new Set(prev);
      if (item === 'No restrictions') {
        // If selecting "No restrictions", clear everything else
        return next.has(item) ? new Set() : new Set([item]);
      }
      // If selecting anything else, remove "No restrictions"
      next.delete('No restrictions');
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  };

  const toggleCuisine = (item: string) => {
    setCuisinePrefs((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  };

  const handleNext = async () => {
    setSaving(true);
    try {
      const goalWeight = weight.trim() ? parseFloat(weight) : null;
      await updateProfile({
        calorie_target: calories,
        protein_target: protein,
        goal_weight: goalWeight && !isNaN(goalWeight) ? goalWeight : null,
        weight_unit: weightUnit,
        dietary_preferences: Array.from(dietaryPrefs),
        cuisine_preferences: Array.from(cuisinePrefs),
      });
      router.push('/(onboarding)/supplements');
    } finally {
      setSaving(false);
    }
  };

  const tipText = isPcos
    ? '💡 Common PCOS targets: 1200–1500 cal, 80–120g protein for weight management'
    : '💡 Adjust targets based on your activity level and goals';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <PixelBackButton />

          <OnboardingCard>
            <Text style={styles.title}>YOUR GOALS</Text>
            <Text style={styles.helper}>
              Set your daily targets. These are just starting points — adjust anytime!
            </Text>

            <Stepper
              label="🔥 Daily Calories"
              value={calories}
              unit="cal"
              min={CAL_MIN}
              max={CAL_MAX}
              step={CAL_STEP}
              onChange={setCalories}
            />

            <Stepper
              label="💪 Daily Protein"
              value={protein}
              unit="g"
              min={PROTEIN_MIN}
              max={PROTEIN_MAX}
              step={PROTEIN_STEP}
              onChange={setProtein}
            />

            {/* Optional weight */}
            <Text style={styles.weightLabel}>⚖️ Goal Weight (optional)</Text>
            <View style={styles.weightRow}>
              <TextInput
                style={styles.weightInput}
                value={weight}
                onChangeText={setWeight}
                placeholder="—"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
              />
              <View style={styles.unitToggle}>
                {(['lbs', 'kg'] as const).map((u) => (
                  <TouchableOpacity
                    key={u}
                    onPress={() => setWeightUnit(u)}
                    style={[styles.unitBtn, weightUnit === u && styles.unitBtnActive]}
                  >
                    <Text style={[styles.unitText, weightUnit === u && styles.unitTextActive]}>
                      {u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <CheckboxGroup
              label="🥗 Dietary Preferences"
              options={DIETARY_OPTIONS}
              selected={dietaryPrefs}
              onToggle={toggleDietary}
            />

            <CheckboxGroup
              label="🍽️ Cuisine Preferences"
              options={CUISINE_OPTIONS}
              selected={cuisinePrefs}
              onToggle={toggleCuisine}
            />

            <Text style={styles.tip}>{tipText}</Text>

            <PixelButton
              title={saving ? 'Saving...' : 'Next →'}
              onPress={handleNext}
              disabled={saving}
            />
          </OnboardingCard>

          <ProgressDots current={3} total={5} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },

  title: {
    fontFamily: Fonts.pixel,
    fontSize: FontSizes.lg,
    color: Colors.purple,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  helper: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  stepperWrap: {
    marginBottom: Spacing.xl,
  },
  stepperLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: {
    opacity: 0.3,
  },
  stepperBtnText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.textOnDark,
  },
  stepperValue: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXl,
    color: Colors.purple,
    minWidth: 100,
    textAlign: 'center',
  },
  stepperUnit: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
  },
  weightLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  weightInput: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
  },
  unitToggle: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    alignSelf: 'stretch',
    flexShrink: 0,
    flexGrow: 0,
  },
  unitBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    minWidth: 40,
    backgroundColor: Colors.background,
  },
  unitBtnActive: {
    backgroundColor: Colors.purple,
  },
  unitText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
  },
  unitTextActive: {
    color: Colors.textOnDark,
  },
  checkboxGroup: {
    marginBottom: Spacing.xl,
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  pill: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
  },
  pillActive: {
    backgroundColor: Colors.purple,
    borderColor: Colors.purple,
  },
  pillText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
  },
  pillTextActive: {
    color: Colors.textOnDark,
  },
  tip: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    fontStyle: 'italic',
  },
});
