import { View, Text, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { PixelButton } from '../../components/ui';
import { OnboardingCard } from '../../components/onboarding/onboarding-card';
import { ProgressDots } from '../../components/onboarding/progress-dots';

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <OnboardingCard>
          <Image
            source={require('../../../assets/images/character/character-waving.png')}
            style={styles.character}
            resizeMode="contain"
          />

          <Text style={styles.title}>WELCOME!</Text>
          <Text style={styles.subtitle}>
            Let&apos;s set up your Healthy Me profile in just a few quick steps 💜
          </Text>
          <Text style={styles.hint}>Takes about 60 seconds. You can change everything later.</Text>

          <PixelButton
            title="Get Started →"
            onPress={() => router.push('/(onboarding)/profile')}
          />
        </OnboardingCard>

        <ProgressDots current={1} total={5} />
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
    fontSize: FontSizes.xl,
    color: Colors.purple,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  hint: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
});
