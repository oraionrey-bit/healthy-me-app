import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {
  Colors,
  Fonts,
  FontSizes,
  Spacing,
  BorderRadius,
} from '../../constants/theme';
import { ScreenWrapper, PixelCard, PixelButton } from '../../components/ui';
import { useExercises } from '../../hooks/use-exercises';

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function MoveScreen() {
  const { todaysExercises, loading, addExercise, deleteExercise } =
    useExercises();
  const [exerciseType, setExerciseType] = useState('');
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const [saving, setSaving] = useState(false);

  const handleLog = async () => {
    if (!exerciseType.trim()) return;
    setSaving(true);
    try {
      await addExercise({
        exercise_type: exerciseType.trim(),
        duration_minutes: duration ? parseInt(duration, 10) : null,
        calories_burned: calories ? parseInt(calories, 10) : null,
      });
      setExerciseType('');
      setDuration('');
      setCalories('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenWrapper scrollable>
      <Text style={styles.header}>🏋️ Move</Text>
      <Text style={styles.date}>{formatDate()}</Text>

      {/* Log Form */}
      <View style={styles.section}>
        <PixelCard>
          <TextInput
            style={styles.input}
            placeholder="Exercise type (e.g. Walk, Yoga)"
            placeholderTextColor={Colors.textMuted}
            value={exerciseType}
            onChangeText={setExerciseType}
          />
          <View style={styles.row}>
            <View style={styles.inputHalf}>
              <TextInput
                style={styles.input}
                placeholder="Duration"
                placeholderTextColor={Colors.textMuted}
                value={duration}
                onChangeText={setDuration}
                keyboardType="number-pad"
              />
              <Text style={styles.inputLabel}>min</Text>
            </View>
            <View style={styles.inputHalf}>
              <TextInput
                style={styles.input}
                placeholder="Calories"
                placeholderTextColor={Colors.textMuted}
                value={calories}
                onChangeText={setCalories}
                keyboardType="number-pad"
              />
              <Text style={styles.inputLabel}>cal</Text>
            </View>
          </View>
          <PixelButton
            title="Log Exercise"
            onPress={handleLog}
            loading={saving}
            disabled={!exerciseType.trim()}
          />
        </PixelCard>
      </View>

      {/* Today's exercises */}
      {todaysExercises.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today</Text>
          <View style={styles.listGap}>
            {todaysExercises.map((ex) => (
              <TouchableOpacity
                key={ex.id}
                onLongPress={() => deleteExercise(ex.id)}
                activeOpacity={0.8}
              >
                <PixelCard>
                  <Text style={styles.exerciseName}>{ex.exercise_type}</Text>
                  <Text style={styles.exerciseDetail}>
                    {ex.duration_minutes
                      ? `${ex.duration_minutes} min`
                      : ''}
                    {ex.duration_minutes && ex.calories_burned ? ' · ' : ''}
                    {ex.calories_burned
                      ? `${ex.calories_burned} cal`
                      : ''}
                  </Text>
                </PixelCard>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {!loading && todaysExercises.length === 0 && (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>No exercises logged today</Text>
        </View>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    fontFamily: Fonts.pixel,
    fontSize: FontSizes.lg,
    color: Colors.purple,
    marginBottom: Spacing.xs,
  },
  date: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontFamily: Fonts.pixel,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  input: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  inputHalf: {
    flex: 1,
  },
  inputLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    position: 'absolute',
    right: Spacing.md,
    top: Spacing.sm + 2,
  },
  listGap: {
    gap: Spacing.sm,
  },
  exerciseName: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.textPrimary,
  },
  exerciseDetail: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textSecondary,
  },
});
