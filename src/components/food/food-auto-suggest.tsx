import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Keyboard,
  Platform,
} from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import type { PersonalFoodSearchResult } from '../../hooks/use-personal-foods';
import type { SavedMeal } from '../../types/database';

interface FoodAutoSuggestProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelectFood: (meal: SavedMeal) => void;
  onSubmit: () => void;
  searchFoods: (query: string, limit?: number) => PersonalFoodSearchResult[];
  searchPantry?: (query: string, limit?: number) => SavedMeal[];
  placeholder?: string;
  autoFocus?: boolean;
  saving?: boolean;
}

const DEBOUNCE_MS = 300;

export function FoodAutoSuggest({
  value,
  onChangeText,
  onSelectFood,
  onSubmit,
  searchFoods,
  searchPantry,
  placeholder = 'e.g., chicken salad, 400 cal, 35g protein',
  autoFocus = false,
  saving = false,
}: FoodAutoSuggestProps) {
  const [suggestions, setSuggestions] = useState<PersonalFoodSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search — pantry items first, then personal foods
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim() || value.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      // Pantry items get priority (score boosted)
      const pantryResults: PersonalFoodSearchResult[] = searchPantry
        ? searchPantry(value, 4).map((meal) => ({ meal, score: 200 }))
        : [];
      const pantryIds = new Set(pantryResults.map((r) => r.meal.id));

      // Regular personal foods (exclude pantry items already included)
      const foodResults = searchFoods(value).filter((r) => !pantryIds.has(r.meal.id));

      const merged = [...pantryResults, ...foodResults].slice(0, 8);
      setSuggestions(merged);
      setShowSuggestions(merged.length > 0);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, searchFoods, searchPantry]);

  const handleSelect = useCallback(
    (meal: SavedMeal) => {
      setShowSuggestions(false);
      setSuggestions([]);
      onSelectFood(meal);
      if (Platform.OS !== 'web') Keyboard.dismiss();
    },
    [onSelectFood],
  );

  const dismissSuggestions = useCallback(() => {
    setShowSuggestions(false);
  }, []);

  const renderSuggestion = useCallback(
    ({ item }: { item: PersonalFoodSearchResult }) => {
      const { meal } = item;
      const isAi = meal.source === 'ai_analyzed';
      const isPantry = meal.is_pantry;

      return (
        <TouchableOpacity
          style={styles.suggestionItem}
          onPress={() => handleSelect(meal)}
          activeOpacity={0.7}
        >
          <View style={styles.suggestionContent}>
            <View style={styles.suggestionHeader}>
              <Text style={styles.suggestionName} numberOfLines={1}>
                {meal.name}
              </Text>
              {isPantry && <Text style={styles.pantryBadge}>🏪</Text>}
              {isAi && !isPantry && <Text style={styles.aiBadge}>🤖</Text>}
            </View>
            <Text style={styles.suggestionMacros}>
              {meal.calories ?? 0} cal · {meal.protein ?? 0}g P
              {meal.carbs != null ? ` · ${meal.carbs}g C` : ''}
              {meal.fat != null ? ` · ${meal.fat}g F` : ''}
              {isPantry && meal.serving_size ? ` · per ${meal.serving_size}` : ''}
            </Text>
            {meal.use_count > 1 && (
              <Text style={styles.suggestionFreq}>Logged {meal.use_count}×</Text>
            )}
          </View>
          <Text style={styles.suggestionArrow}>→</Text>
        </TouchableOpacity>
      );
    },
    [handleSelect],
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={(text) => {
          onChangeText(text);
          if (!text.trim()) dismissSuggestions();
        }}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        autoFocus={autoFocus}
        onSubmitEditing={onSubmit}
        returnKeyType="done"
        editable={!saving}
      />

      {showSuggestions && suggestions.length > 0 && (
        <>
          {/* Backdrop to dismiss on tap outside */}
          {Platform.OS === 'web' && (
            <TouchableOpacity
              style={styles.backdrop}
              onPress={dismissSuggestions}
              activeOpacity={1}
            />
          )}
          <View style={styles.suggestionsContainer}>
            <View style={styles.suggestionsHeader}>
              <Text style={styles.suggestionsTitle}>📋 Your Foods</Text>
              <TouchableOpacity onPress={dismissSuggestions}>
                <Text style={styles.dismissText}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item.meal.id}
              renderItem={renderSuggestion}
              style={styles.suggestionsList}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 100,
  },
  input: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    padding: Spacing.md,
    color: Colors.textPrimary,
  },
  backdrop: {
    position: 'fixed' as 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 200,
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    marginTop: Spacing.xs,
    maxHeight: 260,
    ...({
      shadowColor: '#7c4dff',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    }),
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.tabBarBorder,
  },
  suggestionsTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.purple,
  },
  dismissText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    padding: Spacing.xs,
  },
  suggestionsList: {
    maxHeight: 220,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.tabBarBorder,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  suggestionName: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  aiBadge: {
    fontSize: 10,
  },
  pantryBadge: {
    fontSize: 10,
  },
  suggestionMacros: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  suggestionFreq: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  suggestionArrow: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.purple,
    marginLeft: Spacing.sm,
  },
});
