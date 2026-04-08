import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { PixelCard } from '../ui/pixel-card';
import { PixelButton } from '../ui/pixel-button';
import { ProductAnalyzer, type FoodResult } from '../shared/product-analyzer';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import type { SavedMeal } from '../../types/database';

interface PantrySectionProps {
  items: SavedMeal[];
  loading?: boolean;
  onLogItem: (meal: SavedMeal) => void;
  onRemoveItem: (id: string) => void;
  onAddItem: (meal: { name: string; calories: number | null; protein: number | null; carbs: number | null; fat: number | null }) => void;
}

export function PantrySection({ items, loading, onLogItem, onRemoveItem, onAddItem }: PantrySectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [addMode, setAddMode] = useState<'manual' | 'scan'>('manual');
  const [formName, setFormName] = useState('');
  const [formCalories, setFormCalories] = useState('');
  const [formProtein, setFormProtein] = useState('');
  const [formCarbs, setFormCarbs] = useState('');
  const [formFat, setFormFat] = useState('');

  const handleScanResult = useCallback((data: FoodResult) => {
    const displayName = data.brand ? `${data.brand} ${data.name ?? ''}`.trim() : (data.name ?? '');
    setFormName(displayName);
    if (data.calories != null) setFormCalories(String(data.calories));
    if (data.protein != null) setFormProtein(String(data.protein));
    if (data.carbs != null) setFormCarbs(String(data.carbs));
    if (data.fat != null) setFormFat(String(data.fat));
    setAddMode('manual'); // Switch to manual view so user can review/edit
  }, []);

  const handleAdd = () => {
    if (!formName.trim()) return;
    onAddItem({
      name: formName.trim(),
      calories: formCalories ? parseInt(formCalories, 10) : null,
      protein: formProtein ? parseInt(formProtein, 10) : null,
      carbs: formCarbs ? parseInt(formCarbs, 10) : null,
      fat: formFat ? parseInt(formFat, 10) : null,
    });
    setFormName('');
    setFormCalories('');
    setFormProtein('');
    setFormCarbs('');
    setFormFat('');
    setShowForm(false);
    setAddMode('manual');
  };

  const confirmRemove = (id: string, name: string) => {
    Alert.alert('Remove from Pantry', `Remove "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onRemoveItem(id) },
    ]);
  };

  if (loading) {
    return (
      <PixelCard style={styles.card}>
        <Text style={styles.title}><Image source={require('../../../assets/images/icons/pantry.png')} style={styles.pantryIcon} />{' My Pantry'}</Text>
        <ActivityIndicator color={Colors.purple} style={styles.loader} />
      </PixelCard>
    );
  }

  return (
    <PixelCard style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}><Image source={require('../../../assets/images/icons/pantry.png')} style={styles.pantryIcon} />{' My Pantry'}</Text>
        <TouchableOpacity onPress={() => setShowForm(!showForm)} activeOpacity={0.7}>
          <Text style={styles.addToggle}>{showForm ? '✕' : '+ Add'}</Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={styles.form}>
          {/* Mode toggle: Scan vs Manual */}
          <View style={styles.modeRow}>
            <TouchableOpacity
              onPress={() => setAddMode('scan')}
              style={[styles.modeBtn, addMode === 'scan' && styles.modeBtnActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.modeBtnText, addMode === 'scan' && styles.modeBtnTextActive]}>
                Scan Label
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setAddMode('manual')}
              style={[styles.modeBtn, addMode === 'manual' && styles.modeBtnActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.modeBtnText, addMode === 'manual' && styles.modeBtnTextActive]}>
                Manual
              </Text>
            </TouchableOpacity>
          </View>

          {addMode === 'scan' && (
            <ProductAnalyzer mode="food" onResult={handleScanResult} compact />
          )}

          {addMode === 'manual' && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Food name"
                placeholderTextColor={Colors.textMuted}
                value={formName}
                onChangeText={setFormName}
                autoFocus
              />
              <View style={styles.macroRow}>
                <TextInput
                  style={[styles.input, styles.macroInput]}
                  placeholder="Cal"
                  placeholderTextColor={Colors.textMuted}
                  value={formCalories}
                  onChangeText={setFormCalories}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, styles.macroInput]}
                  placeholder="Protein"
                  placeholderTextColor={Colors.textMuted}
                  value={formProtein}
                  onChangeText={setFormProtein}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, styles.macroInput]}
                  placeholder="Carbs"
                  placeholderTextColor={Colors.textMuted}
                  value={formCarbs}
                  onChangeText={setFormCarbs}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, styles.macroInput]}
                  placeholder="Fat"
                  placeholderTextColor={Colors.textMuted}
                  value={formFat}
                  onChangeText={setFormFat}
                  keyboardType="numeric"
                />
              </View>
              <PixelButton title="Save to Pantry" onPress={handleAdd} variant="primary" />
            </>
          )}
        </View>
      )}

      {items.length === 0 && !showForm && (
        <Text style={styles.emptyText}>No pantry items yet. Tap + Add to stock up!</Text>
      )}

      {items.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.itemRow}
          onPress={() => onLogItem(item)}
          onLongPress={() => confirmRemove(item.id, item.name)}
          activeOpacity={0.7}
        >
          <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.macroChips}>
              {item.calories != null && (
                <Text style={styles.macroChip}>{item.calories} cal</Text>
              )}
              {item.protein != null && (
                <Text style={styles.macroChip}>{item.protein}g protein</Text>
              )}
            </View>
          </View>
          <Text style={styles.logArrow}>{'+'}</Text>
        </TouchableOpacity>
      ))}
    </PixelCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
  },
  pantryIcon: {
    width: 18,
    height: 18,
  },
  addToggle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.purple,
  },
  loader: {
    marginTop: Spacing.md,
  },
  form: {
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  modeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    alignItems: 'center',
  },
  modeBtnActive: {
    borderColor: Colors.purple,
    backgroundColor: Colors.purple + '18',
  },
  modeBtnText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
  },
  modeBtnTextActive: {
    color: Colors.purple,
  },
  input: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
  },
  macroRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  macroInput: {
    flex: 1,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.tabBarBorder,
  },
  itemInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  itemName: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
  },
  macroChips: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  macroChip: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
  },
  logArrow: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.purple,
  },
});
