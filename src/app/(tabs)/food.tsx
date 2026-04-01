import React, { useState, useRef, useEffect } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
  ScrollView,
  ImageSourcePropType,
} from 'react-native';
import { ScreenWrapper, PixelCard, PixelButton } from '../../components/ui';
import { AskOraionFAB, AskOraionModal } from '../../components/chat';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useFoodLog } from '../../hooks/use-food-log';
import { useFoodCalendar } from '../../hooks/use-food-calendar';
import { useUserProfile } from '../../hooks/use-user-profile';
import { useSavedMeals } from '../../hooks/use-saved-meals';
import { usePersonalFoods } from '../../hooks/use-personal-foods';
import { FoodCalendar } from '../../components/food/food-calendar';
import { DaySummaryCard } from '../../components/food/day-summary-card';
import { MealSuggestions } from '../../components/food/meal-suggestions';
import { FoodTrends } from '../../components/food/food-trends';
import { FoodAutoSuggest } from '../../components/food/food-auto-suggest';
import { formatDate, toDateKey } from '../../utils/storage';
import type { FoodLog, SavedMeal } from '../../types/database';

// ── Quick-Add Parser ──

interface ParsedMacros {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

function parseQuickAddText(text: string): ParsedMacros {
  const result: ParsedMacros = { calories: null, protein: null, carbs: null, fat: null };

  const calMatch = text.match(/(\d+)\s*cal/i);
  if (calMatch) result.calories = parseInt(calMatch[1], 10);

  const protMatch = text.match(/(\d+)\s*g?\s*protein/i);
  if (protMatch) result.protein = parseInt(protMatch[1], 10);

  const carbMatch = text.match(/(\d+)\s*g?\s*carb/i);
  if (carbMatch) result.carbs = parseInt(carbMatch[1], 10);

  const fatMatch = text.match(/(\d+)\s*g?\s*fat/i);
  if (fatMatch) result.fat = parseInt(fatMatch[1], 10);

  return result;
}

function hasParsedMacros(macros: ParsedMacros): boolean {
  return macros.calories !== null || macros.protein !== null;
}

type MealType = FoodLog['meal_type'];

const MEAL_ICON_MAP: Record<MealType, ImageSourcePropType> = {
  breakfast: require('../../../assets/images/icons/breakfast.png'),
  lunch: require('../../../assets/images/icons/lunchbox.png'),
  dinner: require('../../../assets/images/icons/dinner.png'),
  snack: require('../../../assets/images/icons/snack.png'),
};

const MEAL_LABELS: { key: MealType; label: string; emoji: string }[] = [
  { key: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { key: 'lunch', label: 'Lunch', emoji: '🌞' },
  { key: 'dinner', label: 'Dinner', emoji: '🌆' },
  { key: 'snack', label: 'Snack', emoji: '🍿' },
];

// Targets now come from useUserProfile() in FoodScreen

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getSmartMealType(): MealType {
  const hour = new Date().getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 17) return 'snack';
  return 'dinner';
}

function FoodEntry({
  entry,
  onDelete,
  onUpdateMealType,
  onUpdateEntry,
  onAddLeftovers,
  onSaveAsFavorite,
}: {
  entry: FoodLog;
  onDelete: () => void;
  onUpdateMealType: (mealType: MealType) => void;
  onUpdateEntry: (updates: Partial<Pick<FoodLog, 'description' | 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber'>>) => void;
  onAddLeftovers: (file: File) => void;
  onSaveAsFavorite: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editDesc, setEditDesc] = useState(entry.description ?? '');
  const [editCal, setEditCal] = useState(String(entry.calories ?? ''));
  const [editProtein, setEditProtein] = useState(String(entry.protein ?? ''));
  const leftoversInputRef = useRef<HTMLInputElement | null>(null);
  const mealInfo = MEAL_LABELS.find((m) => m.key === entry.meal_type) ?? MEAL_LABELS[0];
  const hasAnalysis = entry.ai_analyzed && entry.calories !== null;
  const isAdjusted = entry.notes === 'adjusted_for_leftovers';
  const mealIcon = MEAL_ICON_MAP[entry.meal_type];

  const handleLeftoversFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onAddLeftovers(file);
  };

  return (
    <PixelCard>
      <TouchableOpacity
        style={styles.entryRow}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.entryContent}>
          <View style={styles.entryDescRow}>
            <Image source={mealIcon} style={styles.mealTypeIcon} />
            <Text style={[styles.entryDesc, { flex: 1 }]} numberOfLines={expanded ? undefined : 2}>
              {entry.description || 'No description'}
            </Text>
          </View>
          {hasAnalysis ? (
            <View>
              <Text style={styles.entryNutrition}>
                {entry.calories} cal · {entry.protein ?? 0}g protein
                {entry.carbs != null ? ` · ${entry.carbs}g carbs` : ''}
                {entry.fat != null ? ` · ${entry.fat}g fat` : ''}
              </Text>
              {isAdjusted && (
                <Text style={styles.entryLeftoversNote}>🍽️ Adjusted for leftovers</Text>
              )}
              {entry.notes && !isAdjusted && (
                <Text style={[styles.entryLeftoversNote, { opacity: 0.5 }]}>
                  {entry.notes.includes('claude') ? '🤖 Claude' : entry.notes.includes('gemini') ? '🤖 Gemini' : ''}
                </Text>
              )}
              {entry.ai_pcos_notes ? (
                <Text style={styles.entryPcosNote} numberOfLines={expanded ? undefined : 2}>
                  💡 {entry.ai_pcos_notes}
                </Text>
              ) : null}
              {!expanded && entry.ai_pcos_notes && entry.ai_pcos_notes.length > 80 && (
                <Text style={styles.tapToExpand}>tap to read more</Text>
              )}
            </View>
          ) : entry.calories !== null && !entry.ai_analyzed ? (
            <Text style={styles.entryNutrition}>
              {entry.calories} cal · {entry.protein ?? 0}g protein
            </Text>
          ) : !entry.ai_analyzed ? (
            <Text style={styles.entryAnalyzing}>🔄 Analyzing...</Text>
          ) : (
            <Text style={styles.entryPending}>Pending ⏳</Text>
          )}
        </View>
        <View style={styles.entryActions}>
          {hasAnalysis && (
            <TouchableOpacity
              style={styles.starBtn}
              onPress={(e) => {
                e.stopPropagation();
                onSaveAsFavorite();
              }}
            >
              <Text style={styles.starBtnText}>⭐</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.editBtn}
            onPress={(e) => {
              e.stopPropagation();
              setEditing(!editing);
            }}
          >
            <Text style={styles.editBtnText}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Text style={styles.deleteBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Inline meal type editor */}
      {editing && (
        <View style={styles.editRow}>
          {MEAL_LABELS.map((meal) => (
            <TouchableOpacity
              key={meal.key}
              onPress={() => {
                onUpdateMealType(meal.key);
                setEditing(false);
              }}
              style={[styles.editPill, entry.meal_type === meal.key && styles.editPillActive]}
            >
              <Text
                style={[
                  styles.editPillText,
                  entry.meal_type === meal.key && styles.editPillTextActive,
                ]}
              >
                {meal.emoji} {meal.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Inline description + nutrition editor */}
      {editing && (
        <View style={styles.editFieldsRow}>
          <Text style={styles.editFieldLabel}>Description</Text>
          <TextInput
            style={styles.editTextInput}
            value={editDesc}
            onChangeText={setEditDesc}
            placeholder="What did you eat?"
            multiline
          />
          <View style={styles.editNutritionRow}>
            <View style={styles.editNutritionField}>
              <Text style={styles.editFieldLabel}>Calories</Text>
              <TextInput
                style={styles.editNumberInput}
                value={editCal}
                onChangeText={setEditCal}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
            <View style={styles.editNutritionField}>
              <Text style={styles.editFieldLabel}>Protein (g)</Text>
              <TextInput
                style={styles.editNumberInput}
                value={editProtein}
                onChangeText={setEditProtein}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
          </View>
          <TouchableOpacity
            style={styles.editSaveBtn}
            onPress={() => {
              const updates: Record<string, unknown> = {};
              if (editDesc !== (entry.description ?? '')) updates.description = editDesc;
              const newCal = parseFloat(editCal);
              if (!isNaN(newCal) && newCal !== entry.calories) updates.calories = Math.round(newCal);
              const newPro = parseFloat(editProtein);
              if (!isNaN(newPro) && newPro !== entry.protein) updates.protein = Math.round(newPro * 10) / 10;
              if (Object.keys(updates).length > 0) {
                onUpdateEntry(updates as Partial<Pick<FoodLog, 'description' | 'calories' | 'protein'>>);
              }
              setEditing(false);
            }}
          >
            <Text style={styles.editSaveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Leftovers button — only for analyzed meals */}
      {hasAnalysis && !isAdjusted && (
        <TouchableOpacity
          style={styles.leftoversBtn}
          onPress={() => {
            if (Platform.OS === 'web') {
              leftoversInputRef.current?.click();
            }
          }}
        >
          <Text style={styles.leftoversBtnText}>📸 Add Leftovers</Text>
        </TouchableOpacity>
      )}

      {Platform.OS === 'web' && (
        <input
          ref={leftoversInputRef as React.RefObject<HTMLInputElement>}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleLeftoversFile as unknown as React.ChangeEventHandler<HTMLInputElement>}
        />
      )}
    </PixelCard>
  );
}

export default function FoodScreen() {
  const { user } = useAuth();
  const { calorieTarget, proteinTarget, isPcos, profile } = useUserProfile();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealType>(getSmartMealType());
  const [photos, setPhotos] = useState<string[]>([]);
  const [leftoversPhotos, setLeftoversPhotos] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const leftoversInputRef = useRef<HTMLInputElement | null>(null);
  const [askOraionVisible, setAskOraionVisible] = useState(false);
  const [showTrends, setShowTrends] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddText, setQuickAddText] = useState('');
  const [quickAddSaving, setQuickAddSaving] = useState(false);

  const calendar = useFoodCalendar();
  const { savedMeals, saveMeal, logSavedMeal, deleteSavedMeal } = useSavedMeals();
  const { searchFoods, recentFoods, frequentFoods, autoSaveFromAnalysis, updateFromUserEdit } = usePersonalFoods();
  const [favSaved, setFavSaved] = useState(false);
  const prevEntriesRef = useRef<FoodLog[]>([]);

  const dateKey = toDateKey(currentDate);
  const isToday = isSameDay(currentDate, new Date());
  const { entries, loading, addEntry, deleteEntry, updateMealType, updateEntry, addLeftoversPhoto, totals, refresh: fetchEntries } = useFoodLog(dateKey);

  // Auto-save to personal food dictionary when AI analysis completes
  useEffect(() => {
    const prevEntries = prevEntriesRef.current;
    for (const entry of entries) {
      if (!entry.ai_analyzed || entry.calories == null) continue;
      const prev = prevEntries.find((p) => p.id === entry.id);
      // New analysis just completed (was not analyzed before, now is)
      if (!prev || (!prev.ai_analyzed && entry.ai_analyzed)) {
        autoSaveFromAnalysis(entry);
      }
    }
    prevEntriesRef.current = entries;
  }, [entries, autoSaveFromAnalysis]);

  const calProgress = Math.min(totals.calories / calorieTarget, 1);
  const proteinProgress = Math.min(totals.protein / proteinTarget, 1);

  const goBack = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 1);
    setCurrentDate(prev);
  };

  const goForward = () => {
    if (isToday) return;
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  };

  const handleWebFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const remaining = 5 - photos.length;
    const toProcess = Math.min(files.length, remaining);
    for (let i = 0; i < toProcess; i++) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result;
        if (typeof result === 'string') {
          setPhotos((prev) => (prev.length < 5 ? [...prev, result] : prev));
        }
      };
      reader.readAsDataURL(files[i]);
    }
  };

  const pickImages = () => {
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLeftoversFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const remaining = 3 - leftoversPhotos.length;
    const toProcess = Math.min(files.length, remaining);
    for (let i = 0; i < toProcess; i++) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result;
        if (typeof result === 'string') {
          setLeftoversPhotos((prev) => (prev.length < 3 ? [...prev, result] : prev));
        }
      };
      reader.readAsDataURL(files[i]);
    }
  };

  const pickLeftoversImages = () => {
    if (Platform.OS === 'web') {
      leftoversInputRef.current?.click();
    }
  };

  const removeLeftoverPhoto = (index: number) => {
    setLeftoversPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!description.trim() && photos.length === 0) return;
    setSaving(true);

    // Convert data URIs to File objects for upload
    const photoFiles: File[] = photos.map((uri, i) => {
      const arr = uri.split(',');
      const mime = arr[0]?.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
      const bstr = atob(arr[1] ?? '');
      const u8arr = new Uint8Array(bstr.length);
      for (let j = 0; j < bstr.length; j++) u8arr[j] = bstr.charCodeAt(j);
      return new File([u8arr], `food-${i}.jpg`, { type: mime });
    });

    const leftoversFiles: File[] = leftoversPhotos.map((uri, i) => {
      const arr = uri.split(',');
      const mime = arr[0]?.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
      const bstr = atob(arr[1] ?? '');
      const u8arr = new Uint8Array(bstr.length);
      for (let j = 0; j < bstr.length; j++) u8arr[j] = bstr.charCodeAt(j);
      return new File([u8arr], `leftover-${i}.jpg`, { type: mime });
    });

    const result = await addEntry({
      meal_type: selectedMeal,
      description: description.trim(),
      photos: photoFiles.length > 0 ? photoFiles : undefined,
      leftovers_photos: leftoversFiles.length > 0 ? leftoversFiles : undefined,
    });

    if (!result?.error) {
      setDescription('');
      setPhotos([]);
      setLeftoversPhotos([]);
      setShowForm(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }
    setSaving(false);
  };

  const handleDelete = async (entry: FoodLog) => {
    await deleteEntry(entry.id);
  };

  const resetForm = () => {
    setShowForm(false);
    setDescription('');
    setPhotos([]);
    setLeftoversPhotos([]);
    setSelectedMeal(getSmartMealType());
  };

  const handleSelectPersonalFood = async (meal: SavedMeal) => {
    setQuickAddSaving(true);
    // Log directly from personal food — skip AI analysis
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('food_logs') as any).insert({
      user_id: user?.id,
      log_date: dateKey,
      meal_type: meal.meal_type ?? getSmartMealType(),
      description: meal.name,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      fiber: meal.fiber,
      sugar: null,
      ai_analyzed: true,
      ai_confidence: 1.0,
      ai_pcos_notes: meal.pcos_notes,
      photo_url: null,
      photo_urls: null,
      user_edited: false,
      notes: meal.source === 'ai_analyzed' ? 'from_personal_food|ai' : 'from_personal_food',
    });

    if (!error) {
      // Increment use_count on the personal food
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('saved_meals') as any)
        .update({
          use_count: (meal.use_count ?? 0) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', meal.id);

      setQuickAddText('');
      setShowQuickAdd(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      // Refresh food log
      await fetchEntries();
    }
    setQuickAddSaving(false);
  };

  const handleQuickAdd = async () => {
    const trimmed = quickAddText.trim();
    if (!trimmed) return;
    setQuickAddSaving(true);

    const parsed = parseQuickAddText(trimmed);
    const hasMacros = hasParsedMacros(parsed);

    // Remove macro text to get clean description
    let desc = trimmed
      .replace(/\d+\s*cal(ories?)?/gi, '')
      .replace(/\d+\s*g?\s*protein/gi, '')
      .replace(/\d+\s*g?\s*carb(s|ohydrate)?/gi, '')
      .replace(/\d+\s*g?\s*fat/gi, '')
      .replace(/[,;]+\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!desc) desc = trimmed;

    const result = await addEntry({
      meal_type: getSmartMealType(),
      description: desc,
      calories: hasMacros ? parsed.calories : null,
      protein: hasMacros ? parsed.protein : null,
      carbs: hasMacros ? parsed.carbs : null,
      fat: hasMacros ? parsed.fat : null,
    });

    if (!result?.error) {
      setQuickAddText('');
      setShowQuickAdd(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }
    setQuickAddSaving(false);
  };

  // Group entries by meal type
  const groupedEntries = MEAL_LABELS.map((meal) => ({
    ...meal,
    items: entries.filter((e) => e.meal_type === meal.key),
  })).filter((g) => g.items.length > 0);

  return (
    <>
    <ScreenWrapper scrollable>
      {/* Date Navigation */}
      <View style={styles.dateNav}>
        <TouchableOpacity onPress={goBack} style={styles.navArrow}>
          <Text style={styles.navArrowText}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.dateText}>{formatDate(currentDate)}</Text>
        <TouchableOpacity
          onPress={goForward}
          style={[styles.navArrow, isToday && styles.navArrowDisabled]}
          disabled={isToday}
        >
          <Text style={[styles.navArrowText, isToday && styles.navArrowTextDisabled]}>▶</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setCalendarOpen((v) => !v);
            setShowTrends(false);
            if (!calendarOpen) setSelectedCalDate(null);
          }}
          style={[styles.navArrow, calendarOpen && styles.calToggleActive]}
        >
          <Text style={styles.navArrowText}>📅</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setShowTrends((v) => !v);
            setCalendarOpen(false);
          }}
          style={[styles.navArrow, showTrends && styles.calToggleActive]}
        >
          <Text style={styles.navArrowText}>📊</Text>
        </TouchableOpacity>
      </View>

      {/* Trends View */}
      {showTrends && (
        <FoodTrends onClose={() => setShowTrends(false)} />
      )}

      {/* Calendar View */}
      {calendarOpen && (
        <View style={styles.calendarSection}>
          <FoodCalendar
            currentMonth={calendar.currentMonth}
            onMonthChange={calendar.setCurrentMonth}
            summaries={calendar.summaries}
            selectedDate={selectedCalDate ?? undefined}
            onDaySelect={setSelectedCalDate}
          />
          {selectedCalDate && calendar.summaries.get(selectedCalDate) && (
            <DaySummaryCard
              summary={calendar.summaries.get(selectedCalDate)!}
              dateLabel={formatDate(new Date(selectedCalDate + 'T12:00:00'))}
              onViewFullDay={() => {
                setCurrentDate(new Date(selectedCalDate + 'T12:00:00'));
                setCalendarOpen(false);
                setSelectedCalDate(null);
              }}
            />
          )}
        </View>
      )}

      {/* Day View — hidden when calendar or trends is open */}
      {!calendarOpen && !showTrends && (<>
      {/* Success Toast */}
      {showSuccess && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>✓ Meal saved!</Text>
        </View>
      )}

      {/* Daily Summary */}
      <PixelCard style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Calories</Text>
            <Text style={styles.summaryValue}>
              {totals.calories} <Text style={styles.summaryTarget}>/ {calorieTarget}</Text>
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${calProgress * 100}%` }]} />
            </View>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Protein</Text>
            <Text style={styles.summaryValue}>
              {totals.protein}g <Text style={styles.summaryTarget}>/ {proteinTarget}g</Text>
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${proteinProgress * 100}%` }]} />
            </View>
          </View>
        </View>
      </PixelCard>

      {/* 🤖 Meal Suggestions */}
      {isToday && (
        <MealSuggestions
          calorieTarget={calorieTarget}
          proteinTarget={proteinTarget}
          caloriesConsumed={totals.calories}
          proteinConsumed={totals.protein}
          onSelectMeal={(desc) => {
            setDescription(desc);
            setShowForm(true);
            setSelectedMeal(getSmartMealType());
          }}
          isPcos={isPcos}
          cuisinePreferences={profile?.cuisine_preferences ?? []}
        />
      )}

      {/* ⭐ Favorites Section */}
      {savedMeals.length > 0 && (
        <PixelCard style={styles.favoritesCard}>
          <Text style={styles.favoritesTitle}>⭐ Favorites</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.favoritesScroll}>
            <View style={styles.favoritesRow}>
              {savedMeals.map((meal) => (
                <TouchableOpacity
                  key={meal.id}
                  style={styles.favoriteChip}
                  onPress={async () => {
                    await logSavedMeal(meal.id, dateKey);
                    setShowSuccess(true);
                    setTimeout(() => setShowSuccess(false), 2000);
                    // Refresh food log
                    // The useFoodLog hook will pick it up on next poll/focus
                  }}
                  onLongPress={() => deleteSavedMeal(meal.id)}
                  activeOpacity={0.7}
                >
                  {meal.meal_type && (
                    <Image source={MEAL_ICON_MAP[meal.meal_type]} style={styles.favChipIcon} />
                  )}
                  <View style={styles.favChipContent}>
                    <Text style={styles.favChipName} numberOfLines={1}>{meal.name}</Text>
                    <Text style={styles.favChipMacros}>
                      {meal.calories ?? 0} cal · {meal.protein ?? 0}g P
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <Text style={styles.favoritesHint}>Tap to log · Long press to remove</Text>
        </PixelCard>
      )}

      {savedMeals.length === 0 && entries.length > 0 && (
        <View style={styles.favHintWrap}>
          <Text style={styles.favHintText}>💡 Your foods auto-save after AI analysis for quick re-logging!</Text>
        </View>
      )}

      {/* 🔄 Recent Foods Quick Re-log */}
      {recentFoods.length > 0 && !calendarOpen && !showTrends && (
        <PixelCard style={styles.favoritesCard}>
          <Text style={styles.favoritesTitle}>🕐 Recent</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.favoritesScroll}>
            <View style={styles.favoritesRow}>
              {recentFoods.slice(0, 6).map((meal) => (
                <TouchableOpacity
                  key={`recent-${meal.id}`}
                  style={styles.recentChip}
                  onPress={() => handleSelectPersonalFood(meal)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.recentChipName} numberOfLines={1}>{meal.name}</Text>
                  <Text style={styles.recentChipCal}>{meal.calories ?? 0} cal</Text>
                  {meal.source === 'ai_analyzed' && <Text style={styles.recentAiBadge}>🤖</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </PixelCard>
      )}

      {/* Fav saved toast */}
      {favSaved && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>⭐ Saved to favorites!</Text>
        </View>
      )}

      {/* Quick Add with Auto-Suggest */}
      {showQuickAdd && (
        <PixelCard style={styles.quickAddCard}>
          <Text style={styles.quickAddTitle}>⚡ Quick Add</Text>
          <FoodAutoSuggest
            value={quickAddText}
            onChangeText={setQuickAddText}
            onSelectFood={handleSelectPersonalFood}
            onSubmit={handleQuickAdd}
            searchFoods={searchFoods}
            autoFocus
            saving={quickAddSaving}
          />
          <View style={styles.quickAddRow}>
            <TouchableOpacity onPress={() => { setShowQuickAdd(false); setQuickAddText(''); }} style={styles.quickAddCancel}>
              <Text style={styles.quickAddCancelText}>Cancel</Text>
            </TouchableOpacity>
            <PixelButton
              title={quickAddSaving ? 'Saving...' : 'Save'}
              onPress={handleQuickAdd}
              disabled={quickAddSaving || !quickAddText.trim()}
            />
          </View>
        </PixelCard>
      )}

      {/* Add Meal Button / Form */}
      {!showForm ? (
        <View style={styles.addMealRow}>
          <TouchableOpacity style={styles.addMealBtn} onPress={() => setShowForm(true)}>
            <Text style={styles.addMealText}>+ Add Meal</Text>
          </TouchableOpacity>
          {!showQuickAdd && (
            <TouchableOpacity style={styles.quickAddBtn} onPress={() => setShowQuickAdd(true)}>
              <Text style={styles.quickAddBtnText}>⚡ Quick Add</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <PixelCard style={styles.formCard}>
          {/* Meal type pills */}
          <Text style={styles.formLabel}>Meal Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
            <View style={styles.pillRow}>
              {MEAL_LABELS.map((meal) => (
                <TouchableOpacity
                  key={meal.key}
                  onPress={() => setSelectedMeal(meal.key)}
                  style={[styles.pill, selectedMeal === meal.key && styles.pillActive]}
                >
                  <View style={styles.pillInner}>
                    <Image source={MEAL_ICON_MAP[meal.key]} style={styles.pillIcon} />
                    <Text
                      style={[styles.pillText, selectedMeal === meal.key && styles.pillTextActive]}
                    >
                      {meal.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Photo upload */}
          <Text style={styles.formLabel}>Photos</Text>
          <TouchableOpacity style={styles.photoArea} onPress={pickImages}>
            <Text style={styles.photoAreaText}>📷 Add Photos</Text>
          </TouchableOpacity>

          {Platform.OS === 'web' && (
            <input
              ref={fileInputRef as React.RefObject<HTMLInputElement>}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleWebFileChange as unknown as React.ChangeEventHandler<HTMLInputElement>}
            />
          )}

          {/* Photo thumbnails */}
          {photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbScroll}>
              <View style={styles.thumbRow}>
                {photos.map((uri, i) => (
                  <TouchableOpacity key={`photo-${i}`} onPress={() => removePhoto(i)}>
                    <Image source={{ uri }} style={styles.thumb} />
                    <View style={styles.thumbRemove}>
                      <Text style={styles.thumbRemoveText}>✕</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          {/* Description */}
          <Text style={styles.formLabel}>Description</Text>
          <TextInput
            style={styles.textArea}
            value={description}
            onChangeText={setDescription}
            placeholder="What did you eat?"
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={3}
          />

          {/* Leftovers photos (optional) */}
          <Text style={styles.formLabel}>Leftovers (optional)</Text>
          <Text style={styles.formHint}>Photo what you didn't finish — we'll calculate what you actually ate</Text>
          <TouchableOpacity style={styles.photoAreaSmall} onPress={pickLeftoversImages}>
            <Text style={styles.photoAreaText}>🥡 Add Leftovers Photo</Text>
          </TouchableOpacity>

          {Platform.OS === 'web' && (
            <input
              ref={leftoversInputRef as React.RefObject<HTMLInputElement>}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleLeftoversFileChange as unknown as React.ChangeEventHandler<HTMLInputElement>}
            />
          )}

          {leftoversPhotos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbScroll}>
              <View style={styles.thumbRow}>
                {leftoversPhotos.map((uri, i) => (
                  <TouchableOpacity key={`leftover-${i}`} onPress={() => removeLeftoverPhoto(i)}>
                    <Image source={{ uri }} style={styles.thumb} />
                    <View style={styles.thumbRemove}>
                      <Text style={styles.thumbRemoveText}>✕</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          {/* Buttons */}
          <View style={styles.formButtons}>
            <PixelButton title="Cancel" variant="outline" onPress={resetForm} />
            <PixelButton
              title={saving ? 'Saving...' : 'Save'}
              onPress={handleSubmit}
              disabled={saving || (!description.trim() && photos.length === 0)}
            />
          </View>
        </PixelCard>
      )}

      {/* Loading state */}
      {loading && entries.length === 0 && (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Loading...</Text>
        </View>
      )}

      {/* Grouped Meal List */}
      {groupedEntries.length > 0 && (
        <View style={styles.entriesSection}>
          {groupedEntries.map((group) => (
            <View key={group.key} style={styles.mealGroup}>
              <Text style={styles.groupTitle}>
                {group.emoji} {group.label}
              </Text>
              <View style={styles.entriesGap}>
                {group.items.map((entry) => (
                  <FoodEntry
                    key={entry.id}
                    entry={entry}
                    onDelete={() => handleDelete(entry)}
                    onUpdateMealType={(mealType) => updateMealType(entry.id, mealType)}
                    onUpdateEntry={(updates) => {
                      updateEntry(entry.id, updates);
                      // Also update personal food dictionary with corrected values
                      updateFromUserEdit({ ...entry, ...updates, user_edited: true } as FoodLog);
                    }}
                    onAddLeftovers={(file) => addLeftoversPhoto(entry.id, file)}
                    onSaveAsFavorite={async () => {
                      await saveMeal(entry);
                      setFavSaved(true);
                      setTimeout(() => setFavSaved(false), 2000);
                    }}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Empty State */}
      {!loading && entries.length === 0 && !showForm && (
        <View style={styles.emptyWrap}>
          <Image
            source={require('../../../assets/images/character/character-eating.png')}
            style={styles.emptyChar}
            resizeMode="contain"
          />
          <Text style={styles.emptyTitle}>No meals logged yet today</Text>
          <Text style={styles.emptyHint}>Tap + to add your first meal</Text>
        </View>
      )}
      </>)}
    </ScreenWrapper>
    <AskOraionFAB onPress={() => setAskOraionVisible(true)} />
    <AskOraionModal visible={askOraionVisible} onClose={() => setAskOraionVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  navArrow: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrowDisabled: {
    opacity: 0.3,
  },
  navArrowText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.purple,
  },
  navArrowTextDisabled: {
    color: Colors.textMuted,
  },
  calToggleActive: {
    backgroundColor: Colors.purple,
    borderColor: Colors.purple,
  },
  calendarSection: {
    marginBottom: Spacing.md,
  },
  dateText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
  },
  toast: {
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  toastText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textOnDark,
  },
  summaryCard: {
    marginBottom: Spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  summaryValue: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.purple,
  },
  summaryTarget: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
  },
  summaryDivider: {
    width: 1,
    height: 50,
    backgroundColor: Colors.tabBarBorder,
    marginHorizontal: Spacing.md,
  },
  progressBar: {
    width: '80%',
    height: 6,
    backgroundColor: Colors.tabBarBorder,
    borderRadius: 3,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.purple,
    borderRadius: 3,
  },
  addMealRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  addMealBtn: {
    flex: 1,
    backgroundColor: Colors.purple,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  addMealText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textOnDark,
  },
  quickAddBtn: {
    backgroundColor: Colors.warning,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddBtnText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textOnDark,
  },
  quickAddCard: {
    marginBottom: Spacing.md,
  },
  quickAddTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  quickAddInput: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    padding: Spacing.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  quickAddRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickAddCancel: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  quickAddCancelText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
  },
  formCard: {
    marginBottom: Spacing.lg,
  },
  formLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  pillScroll: {
    flexGrow: 0,
  },
  pillRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
  },
  pillActive: {
    backgroundColor: Colors.purple,
    borderColor: Colors.purple,
  },
  pillText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
  },
  pillTextActive: {
    color: Colors.textOnDark,
  },
  photoArea: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.tabBarBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  photoAreaText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textMuted,
  },
  photoAreaSmall: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.tabBarBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  formHint: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  thumbScroll: {
    flexGrow: 0,
    marginTop: Spacing.sm,
  },
  thumbRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.sm,
  },
  thumbRemove: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbRemoveText: {
    fontFamily: Fonts.body,
    fontSize: 7,
    color: Colors.textOnDark,
  },
  textArea: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    padding: Spacing.md,
    color: Colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  entriesSection: {
    marginTop: Spacing.sm,
  },
  mealGroup: {
    marginBottom: Spacing.lg,
  },
  groupTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.purple,
    marginBottom: Spacing.sm,
  },
  entriesGap: {
    gap: Spacing.sm,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryContent: {
    flex: 1,
  },
  entryDesc: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
  },
  entryNutrition: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  entryPending: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.warning,
    marginTop: 2,
  },
  entryAnalyzing: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.babyBlue,
    marginTop: 2,
  },
  entryPcosNote: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  tapToExpand: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.purple,
    marginTop: 2,
    opacity: 0.7,
  },
  entryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  editBtn: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.softPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: {
    fontSize: 12,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.softPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.error,
  },
  editRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.tabBarBorder,
  },
  editPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
  },
  editPillActive: {
    backgroundColor: Colors.purple,
    borderColor: Colors.purple,
  },
  editPillText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
  },
  editPillTextActive: {
    color: Colors.textOnDark,
  },
  editFieldsRow: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  editFieldLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  editTextInput: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    minHeight: 40,
  },
  editNutritionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  editNutritionField: {
    flex: 1,
  },
  editNumberInput: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    height: 36,
  },
  editSaveBtn: {
    backgroundColor: Colors.purple,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    alignSelf: 'flex-end',
    marginTop: Spacing.xs,
  },
  editSaveBtnText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textOnDark,
    fontWeight: '600',
  },
  leftoversBtn: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.cream,
    borderWidth: 1,
    borderColor: Colors.warning,
    alignSelf: 'flex-start',
  },
  leftoversBtnText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
  },
  entryLeftoversNote: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.warning,
    marginTop: 2,
  },
  // Favorites section
  favoritesCard: {
    marginBottom: Spacing.md,
  },
  favoritesTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.purple,
    marginBottom: Spacing.sm,
  },
  favoritesScroll: {
    flexGrow: 0,
  },
  favoritesRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  favoriteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.softPurple,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.purple,
    minWidth: 140,
    maxWidth: 200,
    gap: Spacing.sm,
  },
  favChipIcon: {
    width: 20,
    height: 20,
  },
  favChipContent: {
    flex: 1,
  },
  favChipName: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
  },
  favChipMacros: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  favoritesHint: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  favHintWrap: {
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.cream,
    borderRadius: BorderRadius.md,
  },
  favHintText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  // Star button on entry
  starBtn: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starBtnText: {
    fontSize: 12,
  },
  // Meal type icon in entries
  entryDescRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  mealTypeIcon: {
    width: 18,
    height: 18,
  },
  // Pill icon styles
  pillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  pillIcon: {
    width: 16,
    height: 16,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyChar: {
    width: 80,
    height: 80,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  emptyHint: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
  },
  // Recent foods section
  recentChip: {
    backgroundColor: Colors.cream,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.warning,
    minWidth: 100,
    maxWidth: 160,
    alignItems: 'center',
  },
  recentChipName: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  recentChipCal: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  recentAiBadge: {
    fontSize: 8,
    position: 'absolute',
    top: 2,
    right: 4,
  },
});
