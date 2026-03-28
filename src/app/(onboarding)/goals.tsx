import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { PixelButton } from '../../components/ui';
import { OnboardingCard } from '../../components/onboarding/onboarding-card';
import { ProgressDots } from '../../components/onboarding/progress-dots';
import { useUserProfile } from '../../hooks/use-user-profile';

const CAL_MIN = 800;
const CAL_MAX = 3000;
const CAL_STEP = 50;
const PROTEIN_MIN = 30;
const PROTEIN_MAX = 250;
const PROTEIN_STEP = 5;

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

export default function GoalsScreen() {
  const { updateProfile } = useUserProfile();

  const [calories, setCalories] = useState(1500);
  const [protein, setProtein] = useState(80);
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs');
  const [saving, setSaving] = useState(false);

  const handleNext = async () => {
    setSaving(true);
    try {
      const goalWeight = weight.trim() ? parseFloat(weight) : null;
      await updateProfile({
        calorie_target: calories,
        protein_target: protein,
        goal_weight: goalWeight && !isNaN(goalWeight) ? goalWeight : null,
        weight_unit: weightUnit,
      });
      router.push('/(onboarding)/supplements');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>◀ Back</Text>
          </TouchableOpacity>

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

            <Text style={styles.tip}>
              💡 Common PCOS targets: 1200–1500 cal, 80–120g protein for weight management
            </Text>

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
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
  },
  backText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.purple,
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
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  weightInput: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    padding: Spacing.md,
    color: Colors.textPrimary,
  },
  unitToggle: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
  },
  unitBtn: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
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
  tip: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    fontStyle: 'italic',
  },
});
