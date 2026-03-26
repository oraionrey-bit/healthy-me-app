import React, { useState } from 'react';
import {
  Text,
  View,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  Pressable,
} from 'react-native';
import { ScreenWrapper, PixelCard, PixelButton, StatDisplay } from '../../components/ui';
import { useFoodLog } from '../../hooks/use-food-log';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import type { FoodLog } from '../../types/database';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
type MealType = (typeof MEAL_TYPES)[number];

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '🌅 Breakfast',
  lunch: '☀️ Lunch',
  dinner: '🌙 Dinner',
  snack: '🍿 Snack',
};

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function FoodScreen() {
  const { todaysFoods, totals, addFood, deleteFood, loading } = useFoodLog();
  const [modalVisible, setModalVisible] = useState(false);
  const [activeMealType, setActiveMealType] = useState<MealType>('breakfast');
  const [description, setDescription] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [saving, setSaving] = useState(false);

  const openAddModal = (mealType: MealType) => {
    setActiveMealType(mealType);
    setDescription('');
    setCalories('');
    setProtein('');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!description.trim()) return;
    setSaving(true);
    try {
      await addFood({
        meal_type: activeMealType,
        description: description.trim(),
        calories: calories ? parseInt(calories, 10) : null,
        protein: protein ? parseInt(protein, 10) : null,
      });
      setModalVisible(false);
    } catch {
      Alert.alert('Error', 'Could not save food entry.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: FoodLog) => {
    Alert.alert('Delete', `Remove "${item.description}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteFood(item.id) },
    ]);
  };

  // Group foods by meal type
  const grouped = MEAL_TYPES.reduce(
    (acc, type) => {
      acc[type] = todaysFoods.filter((f) => f.meal_type === type);
      return acc;
    },
    {} as Record<MealType, FoodLog[]>,
  );

  return (
    <ScreenWrapper scrollable>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Food Log</Text>
        <Text style={styles.date}>{formatDate()}</Text>
      </View>

      {/* Totals bar */}
      <PixelCard style={styles.totalsCard}>
        <View style={styles.totalsRow}>
          <StatDisplay label="Calories" value={totals.calories} color={Colors.purple} />
          <StatDisplay label="Protein" value={totals.protein} unit="g" color={Colors.pink} />
          <StatDisplay label="Carbs" value={totals.carbs} unit="g" color={Colors.babyBlue} />
          <StatDisplay label="Fat" value={totals.fat} unit="g" color={Colors.peach} />
        </View>
      </PixelCard>

      {/* Meal sections */}
      {MEAL_TYPES.map((mealType) => (
        <View key={mealType} style={styles.mealSection}>
          <View style={styles.mealHeader}>
            <Text style={styles.mealTitle}>{MEAL_LABELS[mealType]}</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => openAddModal(mealType)}
            >
              <Text style={styles.addBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          {grouped[mealType].length === 0 ? (
            <Text style={styles.emptyMeal}>No items yet</Text>
          ) : (
            grouped[mealType].map((item) => (
              <Pressable
                key={item.id}
                onLongPress={() => handleDelete(item)}
                style={styles.foodItem}
              >
                <Text style={styles.foodDesc}>{item.description}</Text>
                <View style={styles.foodMeta}>
                  {item.calories != null && (
                    <Text style={styles.foodStat}>{item.calories} cal</Text>
                  )}
                  {item.protein != null && (
                    <Text style={styles.foodStat}>{item.protein}g protein</Text>
                  )}
                </View>
              </Pressable>
            ))
          )}
        </View>
      ))}

      {/* Add food modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Add {MEAL_LABELS[activeMealType]}
            </Text>

            <Text style={styles.inputLabel}>Description *</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Grilled chicken salad"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.inputLabel}>Calories</Text>
            <TextInput
              style={styles.input}
              value={calories}
              onChangeText={setCalories}
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Protein (g)</Text>
            <TextInput
              style={styles.input}
              value={protein}
              onChangeText={setProtein}
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <PixelButton
                title="Cancel"
                variant="outline"
                onPress={() => setModalVisible(false)}
              />
              <PixelButton
                title="Save"
                onPress={handleSave}
                loading={saving}
                disabled={!description.trim()}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts.pixel,
    fontSize: FontSizes.lg,
    color: Colors.purple,
    marginBottom: Spacing.xs,
  },
  date: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textSecondary,
  },
  totalsCard: {
    marginBottom: Spacing.lg,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mealSection: {
    marginBottom: Spacing.lg,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  mealTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.textPrimary,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontFamily: Fonts.pixel,
    fontSize: FontSizes.md,
    color: Colors.textOnDark,
    marginTop: -1,
  },
  emptyMeal: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    paddingLeft: Spacing.sm,
  },
  foodItem: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm + 4,
    marginBottom: Spacing.xs,
    borderLeftWidth: 3,
    borderLeftColor: Colors.lavender,
  },
  foodDesc: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  foodMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  foodStat: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  modalTitle: {
    fontFamily: Fonts.pixel,
    fontSize: FontSizes.sm,
    color: Colors.purple,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  inputLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  input: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    padding: Spacing.sm + 4,
    marginBottom: Spacing.md,
    color: Colors.textPrimary,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    gap: Spacing.md,
  },
});
