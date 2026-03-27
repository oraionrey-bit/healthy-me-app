import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  Colors,
  Fonts,
  FontSizes,
  Spacing,
  BorderRadius,
} from '../../constants/theme';
import { ScreenWrapper, PixelCard, PixelButton } from '../../components/ui';

// Timeline phases
const PHASES = [
  { id: 'reset', label: 'Phase 1: Reset', detail: 'March — Barrier repair', current: true },
  { id: 'azelaic', label: 'Phase 2: Azelaic Acid', detail: 'April — 3x/week', current: false },
  { id: 'tretinoin', label: 'Phase 3: Tretinoin', detail: 'May+ — 1x/week, buffered', current: false },
];

// Routines
const AM_ROUTINE = [
  'Laneige Cream Skin',
  'Wellage HA Blue Ampoule',
  'Aestura Atobarrier 365',
  'Goodal Heartleaf SPF',
];

const PM_ROUTINE = [
  'Laneige Cream Skin',
  'Wellage HA Blue Ampoule',
  'Aestura Atobarrier 365',
];

const SAFE_PRODUCTS = [
  'Laneige Cream Skin Toner & Moisturizer',
  'Wellage Real Hyaluronic Blue Ampoule',
  'Aestura Atobarrier 365 Cream',
  'Goodal Green Tangerine Vita C Dark Spot Serum',
  'Goodal Heartleaf Calming Moisture Sun Cream SPF50+',
  'La Roche-Posay Toleriane Gentle Cleanser',
];

const TRIGGERS = [
  'Niacinamide (high %)',
  'Snail mucin (COSRX)',
  'Vea Lipogel (perioral)',
  'Laneige Lip Sleeping Mask',
];

interface SkinEntry {
  id: string;
  description: string;
  photos: string[];
  date: string;
}

function RoutineChecklist({
  title,
  items,
  checked,
  onToggle,
}: {
  title: string;
  items: string[];
  checked: Record<string, boolean>;
  onToggle: (key: string) => void;
}) {
  return (
    <View style={styles.routineBlock}>
      <Text style={styles.routineLabel}>{title}</Text>
      <View style={styles.listGap}>
        {items.map((item) => {
          const key = `${title}-${item}`;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => onToggle(key)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkRow,
                  checked[key] && styles.checkRowDone,
                ]}
              >
                <View
                  style={[
                    styles.checkbox,
                    checked[key] && styles.checkboxDone,
                  ]}
                >
                  {checked[key] && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text
                  style={[
                    styles.checkText,
                    checked[key] && styles.checkTextDone,
                  ]}
                >
                  {item}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function SkinScreen() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [journalDesc, setJournalDesc] = useState('');
  const [journalPhotos, setJournalPhotos] = useState<string[]>([]);
  const [entries, setEntries] = useState<SkinEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const toggle = (key: string) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const pickImages = async () => {
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets) {
      setJournalPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  };

  const handleWebFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newUris: string[] = [];
    for (let i = 0; i < files.length; i++) {
      newUris.push(URL.createObjectURL(files[i]));
    }
    setJournalPhotos((prev) => [...prev, ...newUris]);
  };

  const submitEntry = () => {
    if (!journalDesc.trim() && journalPhotos.length === 0) return;
    const entry: SkinEntry = {
      id: Date.now().toString(),
      description: journalDesc.trim(),
      photos: [...journalPhotos],
      date: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    };
    setEntries((prev) => [entry, ...prev]);
    setJournalDesc('');
    setJournalPhotos([]);
    setShowJournalForm(false);
  };

  return (
    <ScreenWrapper scrollable>
      <Text style={styles.header}>🧴 Skin</Text>

      {/* Section 1: Skincare Timeline */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Skin Journey</Text>
        <PixelCard>
          <View style={styles.timelineGap}>
            {PHASES.map((phase, index) => (
              <View key={phase.id} style={styles.timelineRow}>
                <View style={styles.timelineDotCol}>
                  <View
                    style={[
                      styles.timelineDot,
                      phase.current && styles.timelineDotActive,
                    ]}
                  />
                  {index < PHASES.length - 1 && (
                    <View style={styles.timelineLine} />
                  )}
                </View>
                <View style={styles.timelineContent}>
                  <Text
                    style={[
                      styles.timelineLabel,
                      phase.current && styles.timelineLabelActive,
                    ]}
                  >
                    {phase.label}
                  </Text>
                  <Text style={styles.timelineDetail}>{phase.detail}</Text>
                </View>
              </View>
            ))}
          </View>
        </PixelCard>
      </View>

      {/* Section 2: Skin Journal */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Skin Log</Text>
          {!showJournalForm && (
            <TouchableOpacity
              style={styles.newEntryBtn}
              onPress={() => setShowJournalForm(true)}
            >
              <Text style={styles.newEntryText}>+ New Entry</Text>
            </TouchableOpacity>
          )}
        </View>

        {showJournalForm && (
          <PixelCard style={styles.journalForm}>
            <Text style={styles.formLabel}>How&apos;s your skin today?</Text>
            <TextInput
              style={styles.textArea}
              value={journalDesc}
              onChangeText={setJournalDesc}
              placeholder="Describe your skin today..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity style={styles.photoArea} onPress={pickImages}>
              <Text style={styles.photoAreaText}>📷 Add photos</Text>
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

            {journalPhotos.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.thumbScroll}
              >
                <View style={styles.thumbRow}>
                  {journalPhotos.map((uri, i) => (
                    <Image
                      key={`j-photo-${i}`}
                      source={{ uri }}
                      style={styles.thumb}
                    />
                  ))}
                </View>
              </ScrollView>
            )}

            <View style={styles.formButtons}>
              <PixelButton
                title="Cancel"
                variant="outline"
                onPress={() => {
                  setShowJournalForm(false);
                  setJournalDesc('');
                  setJournalPhotos([]);
                }}
              />
              <PixelButton
                title="Save Entry"
                onPress={submitEntry}
                disabled={!journalDesc.trim() && journalPhotos.length === 0}
              />
            </View>
          </PixelCard>
        )}

        {entries.length > 0 ? (
          <View style={styles.listGap}>
            {entries.map((entry) => (
              <PixelCard key={entry.id}>
                <Text style={styles.entryDate}>{entry.date}</Text>
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
                          key={`e-photo-${i}`}
                          source={{ uri }}
                          style={styles.thumb}
                        />
                      ))}
                    </View>
                  </ScrollView>
                )}
              </PixelCard>
            ))}
          </View>
        ) : (
          !showJournalForm && (
            <View style={styles.emptyJournal}>
              <Image
                source={require('../../../assets/images/character/character-sad.png')}
                style={styles.emptyChar}
                resizeMode="contain"
              />
              <Text style={styles.emptyText}>No entries yet</Text>
            </View>
          )
        )}
      </View>

      {/* Section 3: My Routine */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Routine</Text>
        <RoutineChecklist
          title="☀️ AM"
          items={AM_ROUTINE}
          checked={checked}
          onToggle={toggle}
        />
        <RoutineChecklist
          title="🌙 PM"
          items={PM_ROUTINE}
          checked={checked}
          onToggle={toggle}
        />
      </View>

      {/* Section 4: Safe Products & Triggers */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Safe Products</Text>
        <View style={styles.listGap}>
          {SAFE_PRODUCTS.map((product) => (
            <PixelCard key={product}>
              <Text style={styles.productText}>{product}</Text>
            </PixelCard>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚠️ Triggers</Text>
        <View style={styles.listGap}>
          {TRIGGERS.map((trigger) => (
            <View key={trigger} style={styles.triggerCard}>
              <Text style={styles.triggerText}>{trigger}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.purple,
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  // Timeline
  timelineGap: {
    gap: 0,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 56,
  },
  timelineDotCol: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.textMuted,
    marginTop: 4,
  },
  timelineDotActive: {
    backgroundColor: Colors.purple,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.lavender,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.tabBarBorder,
    marginVertical: 4,
  },
  timelineContent: {
    flex: 1,
    marginLeft: Spacing.md,
    paddingBottom: Spacing.md,
  },
  timelineLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
  },
  timelineLabelActive: {
    color: Colors.purple,
    fontSize: FontSizes.bodyMd,
  },
  timelineDetail: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  // Journal
  newEntryBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.purple,
  },
  newEntryText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textOnDark,
  },
  journalForm: {
    marginBottom: Spacing.md,
  },
  formLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
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
    marginBottom: Spacing.md,
  },
  photoArea: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.tabBarBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
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
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  entryDate: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
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
  emptyJournal: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyChar: {
    width: 60,
    height: 60,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
  },
  // Routine
  routineBlock: {
    marginBottom: Spacing.md,
  },
  routineLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  listGap: {
    gap: Spacing.sm,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    padding: Spacing.md,
  },
  checkRowDone: {
    backgroundColor: 'rgba(129, 199, 132, 0.08)',
    borderColor: 'rgba(129, 199, 132, 0.3)',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  checkboxDone: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  checkmark: {
    fontFamily: Fonts.body,
    fontSize: 7,
    color: Colors.textOnDark,
  },
  checkText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    flex: 1,
  },
  checkTextDone: {
    color: Colors.textSecondary,
  },
  // Products
  productText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
  },
  triggerCard: {
    backgroundColor: 'rgba(229, 115, 115, 0.1)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(229, 115, 115, 0.3)',
    padding: Spacing.md,
  },
  triggerText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.error,
  },
});
