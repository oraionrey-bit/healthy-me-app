import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { PixelButton } from '../../components/ui';
import { OnboardingCard } from '../../components/onboarding/onboarding-card';
import { ProgressDots } from '../../components/onboarding/progress-dots';
import { useUserProfile } from '../../hooks/use-user-profile';
import { useAuth } from '../../lib/auth';
import type { UserProfile } from '../../types/database';

type PcosType = NonNullable<UserProfile['pcos_type']>;

const PCOS_OPTIONS: Array<{ value: PcosType; label: string; emoji: string }> = [
  { value: 'insulin_resistant', label: 'Insulin Resistant', emoji: '🍬' },
  { value: 'post_pill', label: 'Post-Pill', emoji: '💊' },
  { value: 'inflammatory', label: 'Inflammatory', emoji: '🔥' },
  { value: 'adrenal', label: 'Adrenal', emoji: '⚡' },
  { value: 'unsure', label: 'Not Sure Yet', emoji: '🤔' },
];

export default function ProfileScreen() {
  const { user } = useAuth();
  const { updateProfile } = useUserProfile();
  const emailPrefix = user?.email?.split('@')[0] ?? '';

  const [name, setName] = useState(emailPrefix);
  const [pcosType, setPcosType] = useState<PcosType | null>(null);
  const [saving, setSaving] = useState(false);

  const handleNext = async () => {
    setSaving(true);
    try {
      await updateProfile({
        display_name: name.trim() || emailPrefix,
        pcos_type: pcosType,
      });
      router.push('/(onboarding)/goals');
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

            {/* PCOS Type */}
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
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
  },
  pillTextActive: {
    color: Colors.textOnDark,
  },
});
