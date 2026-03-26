import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';

export default function HealthScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🔬</Text>
        <Text style={styles.title}>Health</Text>
        <Text style={styles.subtitle}>Labs, symptoms, supplements & more</Text>
        <View style={styles.card}>
          <Text style={styles.cardText}>
            Health tracking coming soon.{'\n'}
            Labs, supplements, period, weight, symptoms.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  emoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts.pixel,
    fontSize: FontSizes.lg,
    color: Colors.purple,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.cardBackgroundTranslucent,
    borderRadius: 16,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 320,
  },
  cardText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 30,
  },
});
