import { View, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';

interface OnboardingCardProps {
  children: React.ReactNode;
}

export function OnboardingCard({ children }: OnboardingCardProps) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 420,
    ...Shadows.card,
  },
});
