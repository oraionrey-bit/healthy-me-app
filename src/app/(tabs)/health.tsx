import { View, Text, Image, StyleSheet } from 'react-native';
import { ScreenWrapper } from '../../components/ui';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';

export default function HealthScreen() {
  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <Image
          source={require('../../../assets/images/character/character-pill.png')}
          style={styles.character}
          resizeMode="contain"
        />

        <Text style={styles.title}>Health</Text>

        <Text style={styles.subtitle}>
          Supplements, labs & weight tracking coming soon! 🔬
        </Text>

        <Text style={styles.motivation}>
          Small daily habits build big results.
        </Text>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  character: {
    width: 120,
    height: 120,
    marginBottom: Spacing.xl,
  },
  title: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXl,
    color: Colors.purple,
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  motivation: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
