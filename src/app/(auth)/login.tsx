import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ImageBackground,
} from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../lib/auth';

const BG_NIGHT = require('../../../assets/images/bg-night-city.jpg');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { signIn } = useAuth();

  const handleSendLink = async () => {
    if (!email.trim()) {
      Alert.alert('Oops', 'Please enter your email');
      return;
    }

    setSending(true);
    const { error } = await signIn(email.trim());
    setSending(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <ImageBackground
      source={BG_NIGHT}
      style={styles.bgImage}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Spacer to push content below background artwork */}
          <View style={styles.spacer} />

          {/* Glass card overlay */}
          <View style={styles.glassCard}>
            {/* Pixel title */}
            <Text style={styles.title}>HEALTHY</Text>
            <Text style={styles.titleAccent}>ME</Text>

            <Text style={styles.subtitle}>your pcos companion ♡</Text>

            {/* Character */}
            <Image
              source={require('../../../assets/images/character/character-default.png')}
              style={styles.character}
              resizeMode="contain"
            />

            {sent ? (
              <View style={styles.sentBox}>
                <Text style={styles.sentEmoji}>💌</Text>
                <Text style={styles.sentText}>Magic link sent!</Text>
                <Text style={styles.sentHint}>Check your email to sign in</Text>
                <TouchableOpacity onPress={() => setSent(false)} style={styles.retryButton}>
                  <Text style={styles.retryText}>Try again</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.form}>
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!sending}
                />

                <TouchableOpacity
                  style={[styles.button, sending && styles.buttonDisabled]}
                  onPress={handleSendLink}
                  disabled={sending}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>
                    {sending ? 'Sending...' : '✨ Send Magic Link'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bgImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  spacer: {
    flex: 1,
    minHeight: 120,
  },
  glassCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(30, 20, 50, 0.75)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(179, 136, 255, 0.3)',
    padding: Spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontFamily: Fonts.pixel,
    fontSize: FontSizes.xxl,
    color: '#E8DEF8',
    textAlign: 'center',
    textShadowColor: 'rgba(124, 77, 255, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  titleAccent: {
    fontFamily: Fonts.pixel,
    fontSize: FontSizes.xxl,
    color: Colors.pink,
    textAlign: 'center',
    marginTop: Spacing.xs,
    textShadowColor: 'rgba(255, 128, 171, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: 'rgba(200, 176, 216, 0.9)',
    marginTop: Spacing.sm,
  },
  character: {
    width: 100,
    height: 100,
    marginVertical: Spacing.lg,
  },
  form: {
    width: '100%',
    gap: Spacing.md,
  },
  input: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(179, 136, 255, 0.4)',
  },
  button: {
    backgroundColor: Colors.purple,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    shadowColor: Colors.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textOnDark,
  },
  sentBox: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sentEmoji: {
    fontSize: 48,
  },
  sentText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: '#E8DEF8',
  },
  sentHint: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: 'rgba(200, 176, 216, 0.8)',
  },
  retryButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  retryText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.lavender,
    textDecorationLine: 'underline',
  },
});
