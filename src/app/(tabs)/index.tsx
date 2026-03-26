import { Text, View, Image, StyleSheet } from 'react-native';
import { ScreenWrapper, PixelCard, StatDisplay } from '../../components/ui';
import { useFoodLog } from '../../hooks/use-food-log';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';

const CALORIE_TARGET = 1500;
const PROTEIN_TARGET = 80;

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function HomeScreen() {
  const { totals, todaysFoods, loading } = useFoodLog();
  const hasFood = todaysFoods.length > 0;

  return (
    <ScreenWrapper scrollable>
      <View style={styles.header}>
        <Text style={styles.title}>HEALTHY ME</Text>
        <Text style={styles.date}>{formatDate()}</Text>
      </View>

      <View style={styles.characterWrap}>
        <Image
          source={require('../../../assets/images/character/healthy-me-character-final.jpg')}
          style={styles.character}
          resizeMode="contain"
        />
      </View>

      <PixelCard style={styles.summaryCard}>
        <Text style={styles.cardTitle}>Today's Summary</Text>

        {!loading && hasFood ? (
          <View style={styles.statsRow}>
            <StatDisplay
              label="Calories"
              value={`${totals.calories}/${CALORIE_TARGET}`}
              color={Colors.purple}
            />
            <StatDisplay
              label="Protein"
              value={`${totals.protein}/${PROTEIN_TARGET}`}
              unit="g"
              color={Colors.pink}
            />
          </View>
        ) : (
          <Text style={styles.emptyText}>
            {loading ? 'Loading...' : 'No meals logged yet 🍽️'}
          </Text>
        )}
      </PixelCard>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: Fonts.pixel,
    fontSize: FontSizes.lg,
    color: Colors.purple,
    marginBottom: Spacing.sm,
  },
  date: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.textSecondary,
  },
  characterWrap: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  character: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  summaryCard: {
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    fontFamily: Fonts.pixel,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
});
