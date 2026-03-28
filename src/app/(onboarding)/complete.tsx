import { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { PixelButton } from '../../components/ui';
import { OnboardingCard } from '../../components/onboarding/onboarding-card';
import { ProgressDots } from '../../components/onboarding/progress-dots';
import { useUserProfile } from '../../hooks/use-user-profile';

export default function CompleteScreen() {
  const { profile, calorieTarget, proteinTarget, updateProfile } = useUserProfile();
  const [saving, setSaving] = useState(false);

  const displayName = profile?.display_name || 'friend';

  const handleEnter = async () => {
    setSaving(true);
    try {
      await updateProfile({ onboarding_complete: true });
      router.replace('/(tabs)');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <OnboardingCard>
          <Image
            source={require('../../../assets/images/character/character-celebrating.png')}
            style={styles.character}
            resizeMode="contain"
          />

          <Text style={styles.title}>YOU&apos;RE ALL SET! 🎉</Text>
          <Text style={styles.greeting}>Great job, {displayName}!</Text>

          <View style={styles.summary}>
            <Text style={styles.summaryText}>Your daily targets:</Text>
            <Text style={styles.targets}>
              🔥 {calorieTarget} cal  💪 {proteinTarget}g protein
            </Text>
          </View>

          <Text style={styles.motivation}>
            Small steps, big results. Let&apos;s start your journey! 💜
          </Text>

          <PixelButton
            title={saving ? 'Loading...' : 'Enter Healthy Me →'}
            onPress={handleEnter}
            disabled={saving}
          />
        </OnboardingCard>

        <ProgressDots current={5} total={5} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  character: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: Fonts.pixel,
    fontSize: FontSizes.lg,
    color: Colors.purple,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  greeting: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  summary: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  summaryText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  targets: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.purple,
  },
  motivation: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
});
