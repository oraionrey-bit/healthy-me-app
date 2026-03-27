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
import * as ImagePicker from 'expo-image-picker';
import { ScreenWrapper, PixelCard, PixelButton } from '../../components/ui';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;
type MealType = (typeof MEAL_TYPES)[number];

const CALORIE_TARGET = 1500;
const PROTEIN_TARGET = 80;

interface FoodEntry {
  id: string;
  mealType: MealType;
  description: string;
  photos: string[];
  analyzing: boolean;
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function FoodScreen() {
  const [showForm, setShowForm] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealType>('Breakfast');
  const [photos, setPhotos] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const pickImages = async () => {
    if (Platform.OS === 'web') {
      // Trigger file input on web
      fileInputRef.current?.click();
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  };

  const handleWebFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newUris: string[] = [];
    for (let i = 0; i < files.length; i++) {
      newUris.push(URL.createObjectURL(files[i]));
    }
    setPhotos((prev) => [...prev, ...newUris]);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!description.trim() && photos.length === 0) return;
    const entry: FoodEntry = {
      id: Date.now().toString(),
      mealType: selectedMeal,
      description: description.trim(),
      photos: [...photos],
      analyzing: true,
    };
    setEntries((prev) => [entry, ...prev]);
    setDescription('');
    setPhotos([]);
    setShowForm(false);

    // Simulate analysis completing after 3 seconds
    setTimeout(() => {
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, analyzing: false } : e)),
      );
    }, 3000);
  };

  const resetForm = () => {
    setShowForm(false);
    setDescription('');
    setPhotos([]);
    setSelectedMeal('Breakfast');
  };

  return (
    <ScreenWrapper scrollable>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Food Log</Text>
            <Text style={styles.date}>{formatDate()}</Text>
          </View>
          {!showForm && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setShowForm(true)}
            >
              <Text style={styles.addBtnText}>+</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Running Totals */}
      <PixelCard style={styles.totalsCard}>
        <View style={styles.totalsRow}>
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>0</Text>
            <Text style={styles.totalLabel}>/ {CALORIE_TARGET} cal</Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>0g</Text>
            <Text style={styles.totalLabel}>/ {PROTEIN_TARGET}g protein</Text>
          </View>
        </View>
      </PixelCard>

      {/* Add Form */}
      {showForm && (
        <PixelCard style={styles.formCard}>
          {/* Meal type pills */}
          <Text style={styles.formLabel}>Meal Type</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.pillScroll}
          >
            <View style={styles.pillRow}>
              {MEAL_TYPES.map((meal) => (
                <TouchableOpacity
                  key={meal}
                  onPress={() => setSelectedMeal(meal)}
                  style={[
                    styles.pill,
                    selectedMeal === meal && styles.pillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      selectedMeal === meal && styles.pillTextActive,
                    ]}
                  >
                    {meal}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Photo upload */}
          <Text style={styles.formLabel}>Photos</Text>
          <TouchableOpacity style={styles.photoArea} onPress={pickImages}>
            <Text style={styles.photoAreaText}>
              📷 Tap to add photos
            </Text>
          </TouchableOpacity>

          {/* Web file input (hidden) */}
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
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.thumbScroll}
            >
              <View style={styles.thumbRow}>
                {photos.map((uri, i) => (
                  <TouchableOpacity
                    key={`photo-${i}`}
                    onPress={() => removePhoto(i)}
                  >
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
              title="Submit for Analysis"
              onPress={handleSubmit}
              disabled={!description.trim() && photos.length === 0}
            />
          </View>
        </PixelCard>
      )}

      {/* Today's entries */}
      {entries.length > 0 && (
        <View style={styles.entriesSection}>
          <Text style={styles.entriesTitle}>Today&apos;s Entries</Text>
          <View style={styles.entriesGap}>
            {entries.map((entry) => (
              <PixelCard key={entry.id}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryMeal}>{entry.mealType}</Text>
                  {entry.analyzing && (
                    <Text style={styles.analyzingBadge}>Analyzing... 🔍</Text>
                  )}
                </View>
                {entry.description ? (
                  <Text style={styles.entryDesc}>{entry.description}</Text>
                ) : null}
                {entry.photos.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.entryThumbScroll}
                  >
                    <View style={styles.thumbRow}>
                      {entry.photos.map((uri, i) => (
                        <Image
                          key={`entry-photo-${i}`}
                          source={{ uri }}
                          style={styles.entryThumb}
                        />
                      ))}
                    </View>
                  </ScrollView>
                )}
              </PixelCard>
            ))}
          </View>
        </View>
      )}

      {/* Empty state */}
      {entries.length === 0 && !showForm && (
        <View style={styles.emptyWrap}>
          <Image
            source={require('../../../assets/images/character/character-eating.png')}
            style={styles.emptyChar}
            resizeMode="contain"
          />
          <Text style={styles.emptyText}>
            Tap + to log your first meal
          </Text>
        </View>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.purple,
    marginBottom: Spacing.xs,
  },
  date: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.textOnDark,
    marginTop: -2,
  },
  totalsCard: {
    marginBottom: Spacing.lg,
  },
  totalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalItem: {
    alignItems: 'center',
    flex: 1,
  },
  totalValue: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.purple,
  },
  totalLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  totalDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.tabBarBorder,
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
    width: 64,
    height: 64,
    borderRadius: BorderRadius.sm,
  },
  thumbRemove: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbRemoveText: {
    fontFamily: Fonts.body,
    fontSize: 8,
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
  entriesTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  entriesGap: {
    gap: Spacing.sm,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  entryMeal: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.purple,
  },
  analyzingBadge: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.warning,
  },
  entryDesc: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
  },
  entryThumbScroll: {
    flexGrow: 0,
    marginTop: Spacing.sm,
  },
  entryThumb: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
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
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
  },
});
