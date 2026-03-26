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
} from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../lib/auth';

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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Pixel title */}
        <Text style={styles.title}>HEALTHY</Text>
        <Text style={styles.titleAccent}>ME</Text>

        <Text style={styles.subtitle}>your pcos companion</Text>

        {/* Character */}
        <Image
          source={require('../../../assets/images/character/character-default.jpg')}
          style={styles.character}
          resizeMode="contain"
        />

        {sent ? (
          <View style={styles.sentBox}>
            <Text style={styles.sentEmoji}>✉️</Text>
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
              placeholderTextColor={Colors.textMuted}
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
                {sending ? 'Sending...' : 'Send Magic Link'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  title: {
    fontFamily: Fonts.pixel,
    fontSize: FontSizes.xxl,
    color: Colors.purple,
    textAlign: 'center',
  },
  titleAccent: {
    fontFamily: Fonts.pixel,
    fontSize: FontSizes.xxl,
    color: Colors.pink,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  character: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.xl,
    marginVertical: Spacing.lg,
  },
  form: {
    width: '100%',
    gap: Spacing.md,
  },
  input: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    borderWidth: 2,
    borderColor: Colors.softPurple,
  },
  button: {
    backgroundColor: Colors.purple,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
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
    fontFamily: Fonts.pixel,
    fontSize: FontSizes.md,
    color: Colors.purple,
  },
  sentHint: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textSecondary,
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
