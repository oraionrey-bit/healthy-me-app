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
  ImageBackground,
} from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../lib/auth';

const BG_DAY_TOWN = require('../../../assets/images/bg-day-town-v2.jpg');

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
      source={BG_DAY_TOWN}
      style={styles.bgImage}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* 
          The bg image already has: title, chibi, and a card area (~27-62% from top).
          We just position the form to land inside that card area.
        */}
        <View style={styles.content}>
          <View style={styles.formArea}>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: '12%',
    // Card area runs ~28-73% of screen height. Center form vertically in that card.
    // Shift down slightly from true center to account for title+chibi above card.
    paddingTop: '15%',
  },
  formArea: {
    width: '100%',
  },
  form: {
    width: '100%',
    gap: Spacing.md,
  },
  input: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    borderWidth: 2,
    borderColor: Colors.lavender,
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
    color: Colors.textPrimary,
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
