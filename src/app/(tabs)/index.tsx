import { View, Text, StyleSheet, Image, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';

export default function HomeScreen() {
  return (
    <ImageBackground
      source={require('../../../assets/images/backgrounds/healthy-me-final-background-v2.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Home</Text>
          <Text style={styles.subtitle}>Your daily dashboard</Text>

          <View style={styles.card}>
            <Image
              source={require('../../../assets/images/character/healthy-me-character-final.jpg')}
              style={styles.character}
              resizeMode="contain"
            />
            <Text style={styles.cardText}>
              Welcome to Healthy Me!{'\n'}Start tracking your wellness journey.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
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
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  character: {
    width: 100,
    height: 100,
    marginBottom: Spacing.md,
    imageRendering: 'pixelated',
  } as never,
  cardText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 30,
  },
});
