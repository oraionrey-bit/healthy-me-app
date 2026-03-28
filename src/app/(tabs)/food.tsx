import React, { useState, useRef } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
  ScrollView,
} from 'react-native';
import { ScreenWrapper, PixelCard, PixelButton } from '../../components/ui';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useFoodLog } from '../../hooks/use-food-log';
import { useFoodCalendar } from '../../hooks/use-food-calendar';
import { useUserProfile } from '../../hooks/use-user-profile';
import { FoodCalendar } from '../../components/food/food-calendar';
import { DaySummaryCard } from '../../components/food/day-summary-card';
import { formatDate, toDateKey } from '../../utils/storage';
import type { FoodLog } from '../../types/database';

type MealType = FoodLog['meal_type'];

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

function getLocalPhotos(dateKey: string, entryId: string): string[] {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`hm-photos-${dateKey}-${entryId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalPhotos(dateKey: string, entryId: string, photos: string[]): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    localStorage.setItem(`hm-photos-${dateKey}-${entryId}`, JSON.stringify(photos));
  } catch {}
}

function removeLocalPhotos(dateKey: string, entryId: string): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`hm-photos-${dateKey}-${entryId}`);
  } catch {}
}

function FoodEntry({ entry, onDelete }: { entry: FoodLog; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const mealInfo = MEAL_LABELS.find((m) => m.key === entry.meal_type) ?? MEAL_LABELS[0];

  return (
    <PixelCard>
      <TouchableOpacity
        style={styles.entryRow}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.entryContent}>
          <Text style={styles.entryDesc} numberOfLines={expanded ? undefined : 2}>
            {mealInfo.emoji} {entry.description || 'No description'}
          </Text>
          {entry.ai_analyzed && entry.calories !== null ? (
            <View>
              <Text style={styles.entryNutrition}>
                {entry.calories} cal · {entry.protein ?? 0}g protein
                {entry.carbs != null ? ` · ${entry.carbs}g carbs` : ''}
                {entry.fat != null ? ` · ${entry.fat}g fat` : ''}
              </Text>
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
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Text style={styles.deleteBtnText}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </PixelCard>
  );
}

export default function FoodScreen() {
  const { calorieTarget, proteinTarget } = useUserProfile();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealType>('breakfast');
  const [photos, setPhotos] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const calendar = useFoodCalendar();

  const dateKey = toDateKey(currentDate);
  const isToday = isSameDay(currentDate, new Date());
  const { entries, loading, addEntry, deleteEntry, totals } = useFoodLog(dateKey);

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

  const handleSubmit = async () => {
    if (!description.trim() && photos.length === 0) return;
    setSaving(true);

    const result = await addEntry({
      meal_type: selectedMeal,
      description: description.trim(),
    });

    if (!result?.error) {
      // Save photos locally if any — use timestamp as temp ID
      if (photos.length > 0) {
        const tempPhotoId = Date.now().toString(36);
        saveLocalPhotos(dateKey, tempPhotoId, photos);
      }
      setDescription('');
      setPhotos([]);
      setShowForm(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }
    setSaving(false);
  };

  const handleDelete = async (entry: FoodLog) => {
    removeLocalPhotos(dateKey, entry.id);
    await deleteEntry(entry.id);
  };

  const resetForm = () => {
    setShowForm(false);
    setDescription('');
    setPhotos([]);
    setSelectedMeal('breakfast');
  };

  // Group entries by meal type
  const groupedEntries = MEAL_LABELS.map((meal) => ({
    ...meal,
    items: entries.filter((e) => e.meal_type === meal.key),
  })).filter((g) => g.items.length > 0);

  return (
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
            if (!calendarOpen) setSelectedCalDate(null);
          }}
          style={[styles.navArrow, calendarOpen && styles.calToggleActive]}
        >
          <Text style={styles.navArrowText}>📅</Text>
        </TouchableOpacity>
      </View>

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

      {/* Day View — hidden when calendar is open */}
      {!calendarOpen && (<>
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

      {/* Add Meal Button / Form */}
      {!showForm ? (
        <TouchableOpacity style={styles.addMealBtn} onPress={() => setShowForm(true)}>
          <Text style={styles.addMealText}>+ Add Meal</Text>
        </TouchableOpacity>
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
                  <Text
                    style={[styles.pillText, selectedMeal === meal.key && styles.pillTextActive]}
                  >
                    {meal.emoji} {meal.label}
                  </Text>
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
  addMealBtn: {
    backgroundColor: Colors.purple,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  addMealText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textOnDark,
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
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
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
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  tapToExpand: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.purple,
    marginTop: 2,
    opacity: 0.7,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.softPink,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  deleteBtnText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.error,
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
});
