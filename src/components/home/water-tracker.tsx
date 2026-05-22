import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useWaterLog } from '../../hooks/use-water-log';

interface WaterTrackerProps {
  /** Optional date. Defaults to today. (Added May 7.) */
  date?: Date;
}

export function WaterTracker({ date }: WaterTrackerProps = {}) {
  const { glasses, waterMl, waterGoal, waterGoalMl, addWater, resetWater } =
    useWaterLog(date);

  const progress = Math.min(glasses / waterGoal, 1);
  const isComplete = glasses >= waterGoal;

  return (
    <View style={[styles.card, isComplete && styles.cardComplete]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Image
            source={require('../../../assets/images/icons/bottle.png')}
            style={styles.icon}
          />
          <Text style={styles.title}>💧 Water</Text>
        </View>
        <Text style={styles.progress}>
          {glasses}/{waterGoal} cups
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${progress * 100}%` },
            isComplete && styles.progressFillComplete,
          ]}
        />
      </View>

      <Text style={styles.mlText}>
        {waterMl}ml / {waterGoalMl}ml
      </Text>

      {/* Quick-add buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => addWater(1)}
          activeOpacity={0.7}
        >
          <Text style={styles.addButtonText}>+1 cup</Text>
          <Text style={styles.addButtonSub}>250ml</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => addWater(2)}
          activeOpacity={0.7}
        >
          <Text style={styles.addButtonText}>+2 cups</Text>
          <Text style={styles.addButtonSub}>500ml</Text>
        </TouchableOpacity>
        {glasses > 0 && (
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetWater}
            activeOpacity={0.7}
          >
            <Text style={styles.resetButtonText}>↺</Text>
          </TouchableOpacity>
        )}
      </View>

      {isComplete && (
        <Text style={styles.completeText}>🎉 Hydration goal reached!</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.babyBlue,
    padding: Spacing.md,
    shadowColor: '#7c4dff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardComplete: {
    borderLeftColor: Colors.success,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  icon: {
    width: 20,
    height: 20,
  },
  title: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.textPrimary,
  },
  progress: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.babyBlue,
  },
  progressBar: {
    height: 10,
    backgroundColor: '#E1F0FA',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.babyBlue,
    borderRadius: 5,
  },
  progressFillComplete: {
    backgroundColor: Colors.success,
  },
  mlText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  addButton: {
    flex: 1,
    backgroundColor: '#E1F0FA',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(129, 212, 250, 0.3)',
  },
  addButtonText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
  },
  addButtonSub: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  resetButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textMuted,
  },
  completeText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.success,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
