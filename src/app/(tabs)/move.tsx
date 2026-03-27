import { View, Text, Image, StyleSheet } from 'react-native';
import { ScreenWrapper } from '../../components/ui';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';

export default function MoveScreen() {
  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <Image
          source={require('../../../assets/images/character/character-celebrating.png')}
          style={styles.character}
          resizeMode="contain"
        />

        <Text style={styles.title}>Move</Text>

        <Text style={styles.subtitle}>
          Oura integration coming soon! 🏋️
        </Text>

        <Text style={styles.motivation}>
          Every step counts. Your body will thank you.
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
