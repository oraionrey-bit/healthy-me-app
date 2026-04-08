import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { PixelButton } from '../../components/ui';
import { OnboardingCard } from '../../components/onboarding/onboarding-card';
import { ProgressDots } from '../../components/onboarding/progress-dots';
import { PixelBackButton } from '../../components/onboarding/pixel-back-button';
import { useUserProfile } from '../../hooks/use-user-profile';
import { useAuth } from '../../lib/auth';
import type { UserProfile, HealthCondition } from '../../types/database';

type PcosType = NonNullable<UserProfile['pcos_type']>;

const HEALTH_CONDITIONS: Array<{ value: HealthCondition; label: string; emoji: string }> = [
  { value: 'pcos', label: 'PCOS', emoji: '🎀' },
  { value: 'general', label: 'General Health', emoji: '💚' },
  { value: 'weight_loss', label: 'Weight Loss', emoji: '⚖️' },
  { value: 'diabetes', label: 'Diabetes / Pre-diabetes', emoji: '🩺' },
  { value: 'other', label: 'Other', emoji: '✨' },
];

const PCOS_OPTIONS: Array<{ value: PcosType; label: string; emoji: string }> = [
  { value: 'insulin_resistant', label: 'Insulin Resistant', emoji: '🍬' },
  { value: 'post_pill', label: 'Post-Pill', emoji: '💊' },
  { value: 'inflammatory', label: 'Inflammatory', emoji: '🔥' },
  { value: 'adrenal', label: 'Adrenal', emoji: '⚡' },
  { value: 'unsure', label: 'Not Sure Yet', emoji: '🤔' },
];

export default function ProfileScreen() {
  const { user } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useUserProfile();
  const emailPrefix = user?.email?.split('@')[0] ?? '';

  const [name, setName] = useState(emailPrefix);
  const [age, setAge] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [weight, setWeight] = useState('');
  const [healthCondition, setHealthCondition] = useState<HealthCondition>('general');
  const [pcosType, setPcosType] = useState<PcosType | null>(null);
  const [saving, setSaving] = useState(false);

  // Track the original health condition for change confirmation (Fix 3)
  const originalHealthCondition = useRef<HealthCondition | null>(null);

  // Pre-populate form with existing profile data when editing (Fix 1)
  useEffect(() => {
    if (!profile || profileLoading) return;

    // Store original health condition for change detection
    if (originalHealthCondition.current === null && profile.onboarding_complete) {
      originalHealthCondition.current = profile.health_condition;
    }

    if (profile.display_name) setName(profile.display_name);
    if (profile.age != null) setAge(String(profile.age));
    if (profile.current_weight != null) setWeight(String(profile.current_weight));
    if (profile.health_condition) setHealthCondition(profile.health_condition);
    if (profile.pcos_type) setPcosType(profile.pcos_type);

    // Convert height_cm back to ft/in for display
    if (profile.height_cm != null) {
      const totalInches = Math.round(profile.height_cm / 2.54);
      setHeightFt(String(Math.floor(totalInches / 12)));
      setHeightIn(String(totalInches % 12));
    }
  }, [profile, profileLoading]);

  const saveAndNavigate = async () => {
    setSaving(true);
    try {
      const ft = parseInt(heightFt, 10) || 0;
      const inches = parseInt(heightIn, 10) || 0;
      const heightCm = ft || inches ? Math.round((ft * 12 + inches) * 2.54) : null;
      const parsedAge = parseInt(age, 10) || null;
      const parsedWeight = parseFloat(weight) || null;

      await updateProfile({
        display_name: name.trim() || emailPrefix,
        health_condition: healthCondition,
        pcos_type: healthCondition === 'pcos' ? pcosType : null,
        age: parsedAge,
        height_cm: heightCm,
        current_weight: parsedWeight,
      });
      router.push('/(onboarding)/goals');
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    // Fix 3: Confirm if health condition changed on an existing profile
    const orig = originalHealthCondition.current;
    if (orig && orig !== healthCondition) {
      Alert.alert(
        'Change Health Focus?',
        'Changing your health focus will update your supplement list. Your existing supplement check-in history will be preserved. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => void saveAndNavigate() },
        ],
      );
      return;
    }
    void saveAndNavigate();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <PixelBackButton />

          <OnboardingCard>
            <Text style={styles.title}>ABOUT YOU</Text>
            <Text style={styles.helper}>
              We&apos;ll personalize your experience. Everything is optional!
            </Text>

            {/* Name */}
            <Text style={styles.label}>What should we call you?</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
            />

            {/* Age */}
            <Text style={styles.label}>Age</Text>
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              placeholder="Age"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              maxLength={3}
            />

            {/* Height */}
            <Text style={styles.label}>Height</Text>
            <View style={styles.heightRow}>
              <View style={styles.heightField}>
                <TextInput
                  style={styles.heightInput}
                  value={heightFt}
                  onChangeText={setHeightFt}
                  placeholder="5"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  maxLength={1}
                />
                <Text style={styles.heightUnit}>ft</Text>
              </View>
              <View style={styles.heightField}>
                <TextInput
                  style={styles.heightInput}
                  value={heightIn}
                  onChangeText={setHeightIn}
                  placeholder="4"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  maxLength={2}
                />
                <Text style={styles.heightUnit}>in</Text>
              </View>
            </View>

            {/* Current Weight */}
            <Text style={styles.label}>Current Weight (lbs)</Text>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              placeholder="Weight"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
            />

            {/* Health Condition */}
            <Text style={styles.label}>Health Focus</Text>
            <Text style={styles.labelHint}>
              This helps us tailor your experience and recommendations.
            </Text>
            <View style={styles.pillWrap}>
              {HEALTH_CONDITIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setHealthCondition(opt.value)}
                  style={[styles.pill, healthCondition === opt.value && styles.pillActive]}
                >
                  <Text style={[styles.pillText, healthCondition === opt.value && styles.pillTextActive]}>
                    {opt.emoji} {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* PCOS Type — only shown for PCOS users */}
            {healthCondition === 'pcos' && (
              <>
                <Text style={styles.label}>Your PCOS type</Text>
                <Text style={styles.labelHint}>
                  This helps us tailor recommendations. Pick &quot;Not Sure&quot; if unsure!
                </Text>
                <View style={styles.pillWrap}>
                  {PCOS_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setPcosType(opt.value)}
                      style={[styles.pill, pcosType === opt.value && styles.pillActive]}
                    >
                      <Text style={[styles.pillText, pcosType === opt.value && styles.pillTextActive]}>
                        {opt.emoji} {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <PixelButton
              title={saving ? 'Saving...' : 'Next →'}
              onPress={handleNext}
              disabled={saving}
            />
          </OnboardingCard>

          <ProgressDots current={2} total={5} />
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
  label: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  labelHint: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  input: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    padding: Spacing.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.xl,
  },
  heightRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  heightField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    paddingHorizontal: Spacing.md,
  },
  heightInput: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    paddingVertical: Spacing.md,
  },
  heightUnit: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    marginLeft: Spacing.xs,
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
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
    fontSize: FontSizes.bodyMd,
    color: Colors.textSecondary,
  },
  pillTextActive: {
    color: Colors.textOnDark,
  },
});
