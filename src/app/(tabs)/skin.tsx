import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Image,
  Alert,
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
import { supabase } from '../../lib/supabase';
import { CHAT_RELAY_URL } from '../../constants/chat';

const CHAT_TOKEN = process.env.EXPO_PUBLIC_CHAT_TOKEN ?? '';

import {
  useSkincare,
  type RoutineStep,
  type RoutineTime,
  type ProductStatus,
  type ReactionRating,
  type SkincareProduct,
  type ProductUsageEntry,
} from '../../hooks/use-skincare';
import { useSkinPhotos } from '../../hooks/use-skin-photos';
import { useSkinPlan } from '../../hooks/use-skin-plan';
import { SkinPhotoCapture } from '../../components/skin/skin-photo-capture';
import { SkinPhotoGallery } from '../../components/skin/skin-photo-gallery';
import { PhaseTimeline } from '../../components/skin/phase-timeline';
import { RoutineInsightsCard } from '../../components/skin/routine-insights-card';
import { TesterPerformanceCard } from '../../components/skin/tester-performance-card';

import { RoutineCalendar } from '../../components/skin/routine-calendar';
import { PhaseTransitionModal } from '../../components/skin/phase-transition-modal';
import { SuggestionCard } from '../../components/skin/suggestion-card';
import { SkinProfileCard } from '../../components/skin/skin-profile-card';
import { usePlanSuggestions } from '../../hooks/use-plan-suggestions';
import type { SkinPhoto } from '../../types/database';

// ── Severity display ───────────────────────────────────────────────────

const SEVERITY_LABELS = ['', 'Minimal', 'Mild', 'Moderate', 'Bad', 'Severe'];
const SEVERITY_COLORS = ['', Colors.success, '#a5d6a7', Colors.warning, '#ff8a65', Colors.error];

function SeverityPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.severityRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity
          key={n}
          onPress={() => onChange(n)}
          style={[
            styles.severityDot,
            {
              backgroundColor:
                n <= value ? SEVERITY_COLORS[n] : Colors.tabBarBorder,
            },
          ]}
        >
          <Text
            style={[
              styles.severityNum,
              { color: n <= value ? Colors.textOnDark : Colors.textMuted },
            ]}
          >
            {n}
          </Text>
        </TouchableOpacity>
      ))}
      {value > 0 && (
        <Text style={styles.severityLabel}>{SEVERITY_LABELS[value]}</Text>
      )}
    </View>
  );
}

// ── Routine checklist ──────────────────────────────────────────────────

function RoutineChecklist({
  title,
  steps,
  prefix,
  doneCount,
  isStepDone,
  onToggle,
  editing,
  onEdit,
  onRemove,
  onReorder,
  onAddProduct,
}: {
  title: string;
  steps: RoutineStep[];
  prefix: string;
  doneCount: number;
  isStepDone: (id: string) => boolean;
  onToggle: (id: string) => void;
  editing?: boolean;
  onEdit?: () => void;
  onRemove?: (stepId: string) => void;
  onReorder?: (stepId: string, direction: 'up' | 'down') => void;
  onAddProduct?: () => void;
}) {
  const allDone = doneCount === steps.length && steps.length > 0;

  return (
    <View style={styles.routineBlock}>
      <View style={styles.routineHeader}>
        <Text style={styles.routineLabel}>{title}</Text>
        <View style={styles.routineHeaderRight}>
          <Text
            style={[styles.routineCount, allDone && styles.routineCountDone]}
          >
            {doneCount}/{steps.length}
          </Text>
          {onEdit && (
            <TouchableOpacity onPress={onEdit} activeOpacity={0.7}>
              <Text style={styles.routineEditBtn}>{editing ? 'Done' : 'Edit'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={styles.listGap}>
        {steps.map((step, idx) => {
          const key = `${prefix}-${step.id}`;
          const done = isStepDone(key);

          if (editing) {
            return (
              <View key={key} style={styles.checkRow}>
                <View style={styles.editReorderBtns}>
                  <TouchableOpacity
                    onPress={() => onReorder?.(step.id, 'up')}
                    activeOpacity={0.7}
                    disabled={idx === 0}
                  >
                    <Text style={[styles.reorderArrow, idx === 0 && styles.reorderArrowDisabled]}>▲</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => onReorder?.(step.id, 'down')}
                    activeOpacity={0.7}
                    disabled={idx === steps.length - 1}
                  >
                    <Text style={[styles.reorderArrow, idx === steps.length - 1 && styles.reorderArrowDisabled]}>▼</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.checkText, { flex: 1 }]}>
                  {step.productName}
                </Text>
                <TouchableOpacity
                  onPress={() => onRemove?.(step.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.editRemoveBtn}>✕</Text>
                </TouchableOpacity>
              </View>
            );
          }

          return (
            <TouchableOpacity
              key={key}
              onPress={() => onToggle(key)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkRow, done && styles.checkRowDone]}>
                <View style={[styles.checkbox, done && styles.checkboxDone]}>
                  {done && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.checkText, done && styles.checkTextDone]}>
                  {step.productName}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
        {editing && onAddProduct && (
          <TouchableOpacity
            testID="add-routine-step"
            onPress={onAddProduct}
            activeOpacity={0.7}
          >
            <View style={styles.addRoutineStepBtn}>
              <Text style={styles.addRoutineStepText}>+ Add Product</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Trigger Watchlist ──────────────────────────────────────────────────

function TriggerWatchlist({
  triggers,
  testing,
  safe,
}: {
  triggers: { id: string; name: string }[];
  testing: { id: string; name: string }[];
  safe: { id: string; name: string }[];
}) {
  return (
    <PixelCard>
      <Text style={styles.watchlistTitle}>Trigger Watchlist</Text>
      <View style={styles.pillContainer}>
        {triggers.map((t) => (
          <View key={t.id} style={[styles.pill, styles.pillTrigger]}>
            <Text style={styles.pillTextTrigger} numberOfLines={1}>❌ {t.name}</Text>
          </View>
        ))}
        {testing.map((t) => (
          <View key={t.id} style={[styles.pill, styles.pillTesting]}>
            <Text style={styles.pillTextTesting} numberOfLines={1}>🧪 {t.name}</Text>
          </View>
        ))}
        {safe.slice(0, 4).map((t) => (
          <View key={t.id} style={[styles.pill, styles.pillSafe]}>
            <Text style={styles.pillTextSafe} numberOfLines={1}>✅ {t.name}</Text>
          </View>
        ))}
      </View>
    </PixelCard>
  );
}

// ── Product Library ────────────────────────────────────────────────────

const STATUS_ICON: Record<ProductStatus, string> = {
  safe: '✅',
  trigger: '❌',
  testing: '🧪',
};

const STATUS_OPTIONS: { label: string; value: ProductStatus }[] = [
  { label: '✅ Safe', value: 'safe' },
  { label: '❌ Trigger', value: 'trigger' },
  { label: '🧪 Testing', value: 'testing' },
];

// ── Known triggers for journal selector ────────────────────────────────

const KNOWN_TRIGGERS = [
  'Niacinamide (high %)',
  'Snail Mucin',
  'Laneige Lip Sleeping Mask',
  'Vea Lipogel',
  'Dr. Reju-All Cream',
  'Centellian 24 Madeca Cream',
  "Mary Ruth's Probiotics",
  'New product',
  'Stress',
  'Diet',
  'Hormonal',
  'Weather',
  'Sleep',
];

// ── Main Screen ────────────────────────────────────────────────────────

export default function SkinScreen() {
  const {
    loading,
    amSteps,
    pmSteps,
    amDoneCount,
    pmDoneCount,
    toggleRoutineStep,
    isStepDone,
    journal,
    addJournalEntry,
    products,
    safeProducts,
    triggerProducts,
    testingProducts,
    addProduct,
    updateProductStatus,
    logProductUsage,
    getProductUsageToday,
    getTestingDays,
    upNext,
    addUpNextItem,
    toggleUpNextItem,
    removeUpNextItem,
    addRoutineStep,
    removeRoutineStep,
    reorderRoutineStep,
    updateRoutineStepTime,
    availableProductsForRoutine,
    getAvailableProductsForRoutine,
    deleteProduct,
    routineSteps,
    routineInsights,
    testerSummaries,
  } = useSkincare();

  // ── Routine editing state ──
  const [editingRoutine, setEditingRoutine] = useState<'am' | 'pm' | null>(null);
  const [showProductPicker, setShowProductPicker] = useState<'am' | 'pm' | null>(null);

  // ── Journal form state ──
  const [showJournal, setShowJournal] = useState(false);
  const [journalNotes, setJournalNotes] = useState('');
  const [journalSeverity, setJournalSeverity] = useState(0);
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [reactionProduct, setReactionProduct] = useState('');
  const [reactionDesc, setReactionDesc] = useState('');
  const [reactions, setReactions] = useState<
    { product: string; reaction: string }[]
  >([]);

  // ── Add product state ──
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductStatus, setNewProductStatus] =
    useState<ProductStatus>('testing');
  const [newProductNotes, setNewProductNotes] = useState('');
  const [productPhotoUri, setProductPhotoUri] = useState<string | null>(null);
  const [productScanning, setProductScanning] = useState(false);
  const [productScanError, setProductScanError] = useState<string | null>(null);
  const [productTriggersFound, setProductTriggersFound] = useState<string[]>([]);

  // ── Skin photos ──
  const { photos: skinPhotos, uploading: photoUploading, addPhoto, deletePhoto: deleteSkinPhoto } = useSkinPhotos();

  // ── Skin plan ──
  const { plan: skinPlan, loading: planLoading, advancePhase, revertPhase, getTodayRoutine, getPhaseProgress } = useSkinPlan();
  const [showCalendar, setShowCalendar] = useState(false);
  const [showPhaseModal, setShowPhaseModal] = useState(false);

  // ── Plan suggestions ──
  const { suggestions, pendingCount, approveSuggestion, saveForLater } = usePlanSuggestions(skinPlan?.id);

  // ── Product detail modal ──
  const [detailProductId, setDetailProductId] = useState<string | null>(null);
  const detailProduct = detailProductId ? products.find(p => p.id === detailProductId) ?? null : null;

  // ── Active section (tab-like) ──
  const [activeSection, setActiveSection] = useState<
    'routine' | 'journal' | 'products' | 'plan'
  >('routine');

  // ── Up Next ──
  const [newUpNextText, setNewUpNextText] = useState('');

  const resetJournalForm = () => {
    setJournalNotes('');
    setJournalSeverity(0);
    setSelectedTriggers([]);
    setReactionProduct('');
    setReactionDesc('');
    setReactions([]);
    setShowJournal(false);
  };

  const handleSubmitJournal = async () => {
    if (!journalNotes.trim() && journalSeverity === 0) return;
    await addJournalEntry({
      date: new Date().toISOString().split('T')[0],
      notes: journalNotes.trim(),
      severity: journalSeverity,
      triggers: selectedTriggers,
      productReactions: reactions,
    });
    resetJournalForm();
  };

  const toggleTrigger = (trigger: string) => {
    setSelectedTriggers((prev) =>
      prev.includes(trigger)
        ? prev.filter((t) => t !== trigger)
        : [...prev, trigger],
    );
  };

  const addReaction = () => {
    if (!reactionProduct.trim() || !reactionDesc.trim()) return;
    setReactions((prev) => [
      ...prev,
      { product: reactionProduct.trim(), reaction: reactionDesc.trim() },
    ]);
    setReactionProduct('');
    setReactionDesc('');
  };

  // ── Product photo scanning ──

  const scanProductLabel = useCallback(async (uri: string) => {
    setProductScanning(true);
    setProductScanError(null);
    setProductTriggersFound([]);
    try {
      const resp = await fetch(uri);
      const blob = await resp.blob();

      const formData = new FormData();
      formData.append('message_type', 'skincare_product');
      formData.append('description', 'Analyze this skincare product');
      formData.append('photos', blob, 'skincare-product.jpg');

      const res = await fetch(`${CHAT_RELAY_URL}/analyze`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${CHAT_TOKEN}` },
        body: formData,
      });

      if (!res.ok) throw new Error(`Upload failed (${res.status})`);

      const data = await res.json();
      const messageId = data.id as string;

      // Poll supabase for AI response (max 35s)
      const start = Date.now();
      while (Date.now() - start < 35000) {
        await new Promise((r) => setTimeout(r, 2500));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
        const { data: original } = await (supabase.from('chat_messages') as any)
          .select('status')
          .eq('id', messageId)
          .single();
        if (original?.status !== 'complete') continue;

        // Fetch the AI response
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
        const { data: aiReply } = await (supabase.from('chat_messages') as any)
          .select('content')
          .eq('message_type', 'skincare_product')
          .eq('direction', 'oraion')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (aiReply?.content) {
          const text = String(aiReply.content);
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]) as {
              name?: string;
              brand?: string;
              ingredients?: string[];
              product_type?: string;
              triggers_found?: string[];
              notes?: string;
            };
            // Auto-fill product name (include brand if available)
            if (parsed.name) {
              const displayName = parsed.brand
                ? `${parsed.brand} ${parsed.name}`
                : parsed.name;
              setNewProductName(displayName);
            }
            // Build notes from AI analysis
            const noteParts: string[] = [];
            if (parsed.product_type) noteParts.push(`Type: ${parsed.product_type}`);
            if (parsed.ingredients?.length) noteParts.push(`Key ingredients: ${parsed.ingredients.join(', ')}`);
            if (parsed.notes) noteParts.push(parsed.notes);
            if (noteParts.length) setNewProductNotes(noteParts.join('. '));

            // Handle triggers
            if (parsed.triggers_found && parsed.triggers_found.length > 0) {
              setProductTriggersFound(parsed.triggers_found);
              setNewProductStatus('trigger');
            } else {
              setNewProductStatus('testing');
            }
            return;
          }
          throw new Error('Could not parse product data');
        }
      }
      throw new Error('Timed out — try entering manually');
    } catch (err) {
      setProductScanError(err instanceof Error ? err.message : 'Failed to scan product');
    } finally {
      setProductScanning(false);
    }
  }, []);

  const pickProductPhoto = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setProductPhotoUri(uri);
      await scanProductLabel(uri);
    }
  }, [scanProductLabel]);

  const takeProductPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setProductScanError('Camera permission needed');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setProductPhotoUri(uri);
      await scanProductLabel(uri);
    }
  }, [scanProductLabel]);

  const resetProductForm = () => {
    setNewProductName('');
    setNewProductStatus('testing');
    setNewProductNotes('');
    setProductPhotoUri(null);
    setProductScanError(null);
    setProductTriggersFound([]);
  };

  const handleAddProduct = async () => {
    if (!newProductName.trim()) return;
    await addProduct(newProductName.trim(), newProductStatus, newProductNotes.trim() || undefined);
    resetProductForm();
    setShowAddProduct(false);
  };

  if (loading) {
    return (
      <ScreenWrapper scrollable>
        <Text style={styles.header}>🧴 Skin</Text>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <>
    <ScreenWrapper scrollable>
      <Text style={styles.header}>🧴 Skin</Text>

      {/* ── Section tabs ── */}
      <View style={styles.tabRow}>
        {(
          [
            { key: 'routine', label: 'Routine' },
            { key: 'journal', label: 'Journal' },
            { key: 'products', label: 'Products' },
            { key: 'plan', label: pendingCount > 0 ? `Plan (${pendingCount})` : 'Plan' },
          ] as const
        ).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveSection(tab.key)}
            style={[
              styles.tabBtn,
              activeSection === tab.key && styles.tabBtnActive,
            ]}
          >
            <Text
              style={[
                styles.tabBtnText,
                activeSection === tab.key && styles.tabBtnTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ══════════════ ROUTINE TAB ══════════════ */}
      {activeSection === 'routine' && (
        <View style={styles.section}>
          {/* Trigger Watchlist Card */}
          <View style={styles.sectionGap}>
            <TriggerWatchlist
              triggers={triggerProducts}
              testing={testingProducts}
              safe={safeProducts}
            />
          </View>

          {/* AM Routine */}
          <RoutineChecklist
            title="☀️ AM Routine"
            steps={amSteps}
            prefix="am"
            doneCount={amDoneCount}
            isStepDone={isStepDone}
            onToggle={toggleRoutineStep}
            editing={editingRoutine === 'am'}
            onEdit={() => setEditingRoutine(editingRoutine === 'am' ? null : 'am')}
            onRemove={removeRoutineStep}
            onReorder={reorderRoutineStep}
            onAddProduct={() => setShowProductPicker('am')}
          />

          {/* PM Routine */}
          <RoutineChecklist
            title="🌙 PM Routine"
            steps={pmSteps}
            prefix="pm"
            doneCount={pmDoneCount}
            isStepDone={isStepDone}
            onToggle={toggleRoutineStep}
            editing={editingRoutine === 'pm'}
            onEdit={() => setEditingRoutine(editingRoutine === 'pm' ? null : 'pm')}
            onRemove={removeRoutineStep}
            onReorder={reorderRoutineStep}
            onAddProduct={() => setShowProductPicker('pm')}
          />

          {/* How It's Going */}
          <RoutineInsightsCard
            amAdherence={routineInsights.amAdherence}
            pmAdherence={routineInsights.pmAdherence}
            streak={routineInsights.streak}
            mostSkippedStep={routineInsights.mostSkippedStep}
          />

          <TesterPerformanceCard
            testers={testerSummaries}
            onMarkSafe={(productId) => updateProductStatus(productId, 'safe')}
            onMarkTrigger={(productId) => updateProductStatus(productId, 'trigger')}
          />

          {/* Up Next */}
          <PixelCard>
            <Text style={styles.watchlistTitle}>📋 Up Next</Text>
            <View style={styles.listGap}>
              {upNext.map((item) => (
                <View key={item.id} style={styles.upNextRow}>
                  <TouchableOpacity onPress={() => toggleUpNextItem(item.id)} activeOpacity={0.7}>
                    <View style={[styles.checkbox, item.done && styles.checkboxDone]}>
                      {item.done && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                  <Text style={[styles.upNextText, item.done && styles.upNextTextDone]}>
                    {item.text}
                  </Text>
                  <TouchableOpacity onPress={() => removeUpNextItem(item.id)} activeOpacity={0.7}>
                    <Text style={styles.upNextRemove}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <View style={styles.upNextInputRow}>
              <TextInput
                style={styles.upNextInput}
                value={newUpNextText}
                onChangeText={setNewUpNextText}
                placeholder="Add a skincare goal..."
                placeholderTextColor={Colors.textMuted}
              />
              <TouchableOpacity
                onPress={() => {
                  if (newUpNextText.trim()) {
                    addUpNextItem(newUpNextText.trim());
                    setNewUpNextText('');
                  }
                }}
                style={styles.upNextAddBtn}
                disabled={!newUpNextText.trim()}
              >
                <Text style={styles.upNextAddText}>+</Text>
              </TouchableOpacity>
            </View>
          </PixelCard>
        </View>
      )}

      {/* ══════════════ JOURNAL TAB ══════════════ */}
      {activeSection === 'journal' && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Skin Journal</Text>
            {!showJournal && (
              <TouchableOpacity
                style={styles.newEntryBtn}
                onPress={() => setShowJournal(true)}
              >
                <Text style={styles.newEntryText}>+ New Entry</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Journal form */}
          {showJournal && (
            <PixelCard style={styles.journalForm}>
              <Text style={styles.formLabel}>
                How&apos;s your skin today?
              </Text>

              {/* Notes */}
              <TextInput
                style={styles.textArea}
                value={journalNotes}
                onChangeText={setJournalNotes}
                placeholder="Describe your skin today..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={3}
              />

              {/* Severity */}
              <Text style={styles.formLabel}>Severity</Text>
              <SeverityPicker
                value={journalSeverity}
                onChange={setJournalSeverity}
              />

              {/* Trigger selector */}
              <Text style={[styles.formLabel, { marginTop: Spacing.md }]}>
                Possible Triggers
              </Text>
              <View style={styles.pillContainer}>
                {KNOWN_TRIGGERS.map((trigger) => {
                  const selected = selectedTriggers.includes(trigger);
                  return (
                    <TouchableOpacity
                      key={trigger}
                      onPress={() => toggleTrigger(trigger)}
                    >
                      <View
                        style={[
                          styles.pill,
                          selected ? styles.pillSelected : styles.pillDefault,
                        ]}
                      >
                        <Text
                          style={
                            selected
                              ? styles.pillTextSelected
                              : styles.pillTextDefault
                          }
                        >
                          {trigger}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Product reactions */}
              <Text style={[styles.formLabel, { marginTop: Spacing.md }]}>
                Product Reactions
              </Text>
              <View style={styles.reactionInputRow}>
                <TextInput
                  style={[styles.reactionInput, { flex: 1 }]}
                  value={reactionProduct}
                  onChangeText={setReactionProduct}
                  placeholder="Product"
                  placeholderTextColor={Colors.textMuted}
                />
                <TextInput
                  style={[styles.reactionInput, { flex: 1 }]}
                  value={reactionDesc}
                  onChangeText={setReactionDesc}
                  placeholder="Reaction"
                  placeholderTextColor={Colors.textMuted}
                />
                <TouchableOpacity
                  style={styles.addReactionBtn}
                  onPress={addReaction}
                >
                  <Text style={styles.addReactionText}>+</Text>
                </TouchableOpacity>
              </View>
              {reactions.length > 0 && (
                <View style={styles.reactionList}>
                  {reactions.map((r, i) => (
                    <View key={`reaction-${i}`} style={styles.reactionChip}>
                      <Text style={styles.reactionChipText}>
                        {r.product}: {r.reaction}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Submit/Cancel */}
              <View style={styles.formButtons}>
                <PixelButton
                  title="Cancel"
                  variant="outline"
                  onPress={resetJournalForm}
                />
                <PixelButton
                  title="Save Entry"
                  onPress={handleSubmitJournal}
                  disabled={!journalNotes.trim() && journalSeverity === 0}
                />
              </View>
            </PixelCard>
          )}

          {/* Journal entries */}
          {journal.length > 0 ? (
            <View style={styles.listGap}>
              {journal.map((entry) => (
                <PixelCard key={entry.id}>
                  <View style={styles.entryHeader}>
                    <Text style={styles.entryDate}>
                      {new Date(entry.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                    {entry.severity > 0 && (
                      <View
                        style={[
                          styles.severityBadge,
                          {
                            backgroundColor:
                              SEVERITY_COLORS[entry.severity] + '22',
                            borderColor: SEVERITY_COLORS[entry.severity],
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.severityBadgeText,
                            { color: SEVERITY_COLORS[entry.severity] },
                          ]}
                        >
                          {SEVERITY_LABELS[entry.severity]}
                        </Text>
                      </View>
                    )}
                  </View>
                  {entry.notes ? (
                    <Text style={styles.entryDesc}>{entry.notes}</Text>
                  ) : null}
                  {entry.triggers.length > 0 && (
                    <View style={styles.entryPillRow}>
                      {entry.triggers.map((t) => (
                        <View
                          key={t}
                          style={[styles.pill, styles.pillTriggerSmall]}
                        >
                          <Text style={styles.pillTextTriggerSmall}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {entry.productReactions.length > 0 && (
                    <View style={styles.entryReactions}>
                      {entry.productReactions.map((r, i) => (
                        <Text
                          key={`er-${i}`}
                          style={styles.entryReactionText}
                        >
                          💊 {r.product} → {r.reaction}
                        </Text>
                      ))}
                    </View>
                  )}
                </PixelCard>
              ))}
            </View>
          ) : (
            !showJournal && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📓</Text>
                <Text style={styles.emptyText}>No journal entries yet</Text>
                <Text style={styles.emptySubtext}>
                  Track your skin condition daily
                </Text>
              </View>
            )
          )}

          {/* ── Photos section (integrated) ── */}
          <View style={styles.sectionGap}>
            <Text style={styles.sectionTitle}>📸 Skin Progress</Text>
          </View>
          <View style={styles.sectionGap}>
            <SkinPhotoCapture
              onCapture={async (file: File, notes: string, angle: NonNullable<SkinPhoto['angle']>) => {
                await addPhoto({ photoFile: file, notes, angle });
              }}
              uploading={photoUploading}
            />
          </View>
          <SkinPhotoGallery photos={skinPhotos} onDelete={deleteSkinPhoto} />
        </View>
      )}

      {/* ══════════════ PRODUCTS TAB ══════════════ */}
      {activeSection === 'products' && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Product Library</Text>
            <TouchableOpacity
              style={styles.newEntryBtn}
              onPress={() => setShowAddProduct(true)}
            >
              <Text style={styles.newEntryText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {/* Group: Safe */}
          {safeProducts.length > 0 && (
            <View style={styles.productGroup}>
              <Text style={styles.productGroupTitle}>✅ Safe Products</Text>
              <View style={styles.listGap}>
                {safeProducts.map((p) => (
                  <ProductRow
                    key={p.id}
                    product={p}
                    todayUsage={getProductUsageToday(p.id)}
                    testingDays={getTestingDays(p)}
                    onStatusChange={(s) => updateProductStatus(p.id, s)}
                    onLogUsage={(rating, note) => logProductUsage(p.id, rating, note)}
                    onViewDetail={() => setDetailProductId(p.id)}
                    onDelete={() => deleteProduct(p.id)}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Group: Testing */}
          {testingProducts.length > 0 && (
            <View style={styles.productGroup}>
              <Text style={styles.productGroupTitle}>🧪 Testing</Text>
              <View style={styles.listGap}>
                {testingProducts.map((p) => (
                  <ProductRow
                    key={p.id}
                    product={p}
                    todayUsage={getProductUsageToday(p.id)}
                    testingDays={getTestingDays(p)}
                    onStatusChange={(s) => updateProductStatus(p.id, s)}
                    onLogUsage={(rating, note) => logProductUsage(p.id, rating, note)}
                    onViewDetail={() => setDetailProductId(p.id)}
                    onDelete={() => deleteProduct(p.id)}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Group: Triggers */}
          {triggerProducts.length > 0 && (
            <View style={styles.productGroup}>
              <Text style={styles.productGroupTitle}>❌ Triggers</Text>
              <View style={styles.listGap}>
                {triggerProducts.map((p) => (
                  <ProductRow
                    key={p.id}
                    product={p}
                    todayUsage={getProductUsageToday(p.id)}
                    testingDays={getTestingDays(p)}
                    onStatusChange={(s) => updateProductStatus(p.id, s)}
                    onLogUsage={(rating, note) => logProductUsage(p.id, rating, note)}
                    onViewDetail={() => setDetailProductId(p.id)}
                    onDelete={() => deleteProduct(p.id)}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Add product modal */}
          <Modal
            visible={showAddProduct}
            transparent
            animationType="fade"
            onRequestClose={() => setShowAddProduct(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.modalTitle}>Add Product</Text>

                {/* Photo scan section */}
                {!productPhotoUri && !productScanning && (
                  <View style={styles.productPhotoSection}>
                    <Text style={styles.productPhotoHint}>📸 Scan product label to auto-fill</Text>
                    <View style={styles.productPhotoButtons}>
                      <TouchableOpacity onPress={takeProductPhoto} style={styles.productPhotoBtn}>
                        <Text style={styles.productPhotoBtnText}>📷 Camera</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={pickProductPhoto} style={styles.productPhotoBtn}>
                        <Text style={styles.productPhotoBtnText}>🖼️ Gallery</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.productOrText}>— or enter manually below —</Text>
                  </View>
                )}

                {productScanning && (
                  <View style={styles.productScanningWrap}>
                    <ActivityIndicator size="small" color={Colors.purple} />
                    <Text style={styles.productScanningText}>Analyzing product...</Text>
                  </View>
                )}

                {productPhotoUri && !productScanning && (
                  <View style={styles.productPhotoPreview}>
                    <Image source={{ uri: productPhotoUri }} style={styles.productPreviewImage} resizeMode="contain" />
                    <TouchableOpacity onPress={() => { setProductPhotoUri(null); setProductScanError(null); setProductTriggersFound([]); }}>
                      <Text style={styles.productRetakeText}>Retake photo</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {productScanError && (
                  <Text style={styles.productErrorText}>⚠️ {productScanError}</Text>
                )}

                {productTriggersFound.length > 0 && (
                  <View style={styles.productTriggerWarning}>
                    <Text style={styles.productTriggerText}>⚠️ Contains known triggers: {productTriggersFound.join(', ')}</Text>
                  </View>
                )}

                <TextInput
                  style={styles.modalInput}
                  value={newProductName}
                  onChangeText={setNewProductName}
                  placeholder="Product name"
                  placeholderTextColor={Colors.textMuted}
                  autoFocus={!productPhotoUri}
                />
                <View style={styles.statusPickerRow}>
                  {STATUS_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setNewProductStatus(opt.value)}
                      style={[
                        styles.statusOption,
                        newProductStatus === opt.value &&
                          styles.statusOptionActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusOptionText,
                          newProductStatus === opt.value &&
                            styles.statusOptionTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={[styles.modalInput, styles.productNotesInput]}
                  value={newProductNotes}
                  onChangeText={setNewProductNotes}
                  placeholder="Notes (optional)"
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  numberOfLines={3}
                />

                <View style={styles.formButtons}>
                  <PixelButton
                    title="Cancel"
                    variant="outline"
                    onPress={() => {
                      setShowAddProduct(false);
                      resetProductForm();
                    }}
                  />
                  <PixelButton
                    title="Add"
                    onPress={handleAddProduct}
                    disabled={!newProductName.trim()}
                  />
                </View>
                </ScrollView>
              </View>
            </View>
          </Modal>
        </View>
      )}
      {/* ══════════════ PLAN TAB ══════════════ */}
      {activeSection === 'plan' && (
        <View style={styles.section}>
          {planLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading plan...</Text>
            </View>
          ) : !skinPlan ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyText}>No active skin plan</Text>
              <Text style={styles.emptySubtext}>
                A personalized plan will appear here
              </Text>
            </View>
          ) : (
            <>
              {/* Calendar toggle */}
              <View style={styles.planHeaderRow}>
                <Text style={styles.sectionTitle}>{skinPlan.planName}</Text>
                <TouchableOpacity
                  style={styles.calendarToggle}
                  onPress={() => setShowCalendar(!showCalendar)}
                >
                  <Text style={styles.calendarToggleText}>
                    {showCalendar ? '📋 Plan' : '📅 Calendar'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Pending suggestions — always visible above plan content */}
              {suggestions.length > 0 && (
                <View style={styles.sectionGap}>
                  {suggestions.map((s) => (
                    <SuggestionCard
                      key={s.id}
                      suggestion={s}
                      onApprove={approveSuggestion}
                      onSaveForLater={saveForLater}
                    />
                  ))}
                </View>
              )}

              {showCalendar ? (
                <RoutineCalendar activePhase={skinPlan.phases[skinPlan.activePhaseIndex]} />
              ) : (
                <>
                  <View style={styles.sectionGap}>
                    <PhaseTimeline
                      phases={skinPlan.phases}
                      activePhaseIndex={skinPlan.activePhaseIndex}
                      progress={getPhaseProgress(skinPlan)}
                    />
                  </View>

                  {/* Phase check-in countdown */}
                  {(() => {
                    const activePhase = skinPlan.phases[skinPlan.activePhaseIndex];
                    if (activePhase?.startDate && activePhase.durationWeeks > 0) {
                      const start = new Date(activePhase.startDate);
                      const now = new Date();
                      const daysIn = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
                      const totalDays = activePhase.durationWeeks * 7;
                      const daysRemaining = Math.max(0, totalDays - daysIn);
                      return (
                        <Text style={styles.phaseCheckinText}>
                          {daysRemaining > 0
                            ? `Next check-in in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`
                            : 'Phase check-in ready'}
                        </Text>
                      );
                    }
                    return null;
                  })()}

                  {/* Skin profile — collapsed by default */}
                  {skinPlan.skinProfile && (
                    <SkinProfileCard profile={skinPlan.skinProfile} />
                  )}
                </>
              )}

              {/* Phase transition modal */}
              <PhaseTransitionModal
                visible={showPhaseModal}
                currentPhase={skinPlan.phases[skinPlan.activePhaseIndex]}
                nextPhase={
                  skinPlan.activePhaseIndex < skinPlan.phases.length - 1
                    ? skinPlan.phases[skinPlan.activePhaseIndex + 1]
                    : null
                }
                onAdvance={async () => {
                  await advancePhase();
                  setShowPhaseModal(false);
                }}
                onStay={() => setShowPhaseModal(false)}
              />
            </>
          )}
        </View>
      )}
    </ScreenWrapper>

    {/* ══════════════ PRODUCT DETAIL MODAL ══════════════ */}
    <Modal
      visible={!!detailProduct}
      transparent
      animationType="fade"
      onRequestClose={() => setDetailProductId(null)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {detailProduct && (
              <ProductDetailView
                product={detailProduct}
                onClose={() => setDetailProductId(null)}
                onDelete={(id) => { deleteProduct(id); setDetailProductId(null); }}
              />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>

    {/* ══════════════ PRODUCT PICKER MODAL ══════════════ */}
    <Modal
      visible={showProductPicker !== null}
      transparent
      animationType="fade"
      onRequestClose={() => setShowProductPicker(null)}
    >
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowProductPicker(null)}>
        <TouchableOpacity style={styles.modalContent} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={styles.routineHeader}>
            <Text style={styles.sectionTitle}>Add Product to Routine</Text>
            <TouchableOpacity onPress={() => setShowProductPicker(null)} activeOpacity={0.7}>
              <Text style={styles.editRemoveBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: Spacing.md }}>
            {(() => {
              const filtered = showProductPicker ? getAvailableProductsForRoutine(showProductPicker) : [];
              return filtered.length === 0 ? (
              <Text style={styles.emptyText}>No more products available to add</Text>
            ) : (
              <View style={styles.listGap}>
                {filtered.map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (showProductPicker) {
                        addRoutineStep(product.id, showProductPicker);
                      }
                      setShowProductPicker(null);
                    }}
                  >
                    <View style={styles.checkRow}>
                      <Text style={styles.checkText}>{product.name}</Text>
                      <Text style={styles.productPickerStatus}>
                        {product.status === 'safe' ? '✅' : '🧪'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            );
            })()}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>

    </>
  );
}

// ── Product Detail View ───────────────────────────────────────────────

const RATING_EMOJI: Record<ReactionRating, string> = {
  good: '👍',
  neutral: '😐',
  bad: '👎',
};

function ProductDetailView({
  product,
  onClose,
  onDelete,
}: {
  product: SkincareProduct;
  onClose: () => void;
  onDelete?: (productId: string) => void;
}) {
  const log = [...(product.usageLog ?? [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const goodCount = log.filter((e) => e.rating === 'good').length;
  const neutralCount = log.filter((e) => e.rating === 'neutral').length;
  const badCount = log.filter((e) => e.rating === 'bad').length;
  const total = log.length;

  return (
    <View>
      <View style={styles.detailHeader}>
        <Text style={styles.modalTitle}>
          {STATUS_ICON[product.status]} {product.name}
        </Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.detailClose}>✕</Text>
        </TouchableOpacity>
      </View>

      {product.notes && (
        <Text style={styles.detailNotes}>{product.notes}</Text>
      )}

      {product.status === 'testing' && product.testingStartDate && (
        <View style={styles.detailTestingBadge}>
          <Text style={styles.detailTestingText}>
            🧪 Testing since {new Date(product.testingStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      )}

      {/* Reaction summary */}
      {total > 0 && (
        <View style={styles.detailSummary}>
          <Text style={styles.detailSummaryTitle}>Reaction Summary ({total} logs)</Text>
          <View style={styles.detailBarRow}>
            {goodCount > 0 && (
              <View style={[styles.detailBar, { flex: goodCount, backgroundColor: Colors.success }]}>
                <Text style={styles.detailBarText}>👍 {goodCount}</Text>
              </View>
            )}
            {neutralCount > 0 && (
              <View style={[styles.detailBar, { flex: neutralCount, backgroundColor: Colors.warning }]}>
                <Text style={styles.detailBarText}>😐 {neutralCount}</Text>
              </View>
            )}
            {badCount > 0 && (
              <View style={[styles.detailBar, { flex: badCount, backgroundColor: Colors.error }]}>
                <Text style={styles.detailBarText}>👎 {badCount}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Usage log */}
      {total > 0 ? (
        <View style={styles.detailLogSection}>
          <Text style={styles.detailSummaryTitle}>Usage History</Text>
          {log.map((entry, i) => (
            <View key={`log-${i}`} style={styles.detailLogRow}>
              <Text style={styles.detailLogDate}>
                {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
              <Text style={styles.detailLogEmoji}>{RATING_EMOJI[entry.rating]}</Text>
              {entry.note && <Text style={styles.detailLogNote}>{entry.note}</Text>}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No usage logged yet</Text>
          <Text style={styles.emptySubtext}>Tap a reaction emoji on the product to start tracking</Text>
        </View>
      )}

      {onDelete && (
        <TouchableOpacity
          style={styles.deleteProductBtn}
          onPress={() => onDelete(product.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.deleteProductText}>🗑 Remove Product</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Product Row Component ──────────────────────────────────────────────

const REACTION_OPTIONS: { label: string; value: ReactionRating; color: string }[] = [
  { label: '👍', value: 'good', color: Colors.success },
  { label: '😐', value: 'neutral', color: Colors.warning },
  { label: '👎', value: 'bad', color: Colors.error },
];

function ProductRow({
  product,
  todayUsage,
  testingDays,
  onStatusChange,
  onLogUsage,
  onViewDetail,
  onDelete,
}: {
  product: SkincareProduct;
  todayUsage?: ProductUsageEntry;
  testingDays: number;
  onStatusChange: (s: ProductStatus) => void;
  onLogUsage: (rating: ReactionRating, note?: string) => void;
  onViewDetail: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [reactionNote, setReactionNote] = useState('');
  const { name, status, notes } = product;
  const usageCount = product.usageLog?.length ?? 0;

  return (
    <PixelCard>
      <TouchableOpacity testID={`product-card-${product.id}`} onPress={() => setExpanded(!expanded)}>
        <View style={styles.productRow}>
          <Text style={styles.productIcon}>{STATUS_ICON[status]}</Text>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{name}</Text>
            <View style={styles.productMeta}>
              {notes && <Text style={styles.productNotes}>{notes}</Text>}
              {status === 'testing' && testingDays > 0 && (
                <Text style={styles.testingDays}>Day {testingDays}</Text>
              )}
              {usageCount > 0 && (
                <Text style={styles.usageCount}>{usageCount} logs</Text>
              )}
            </View>
          </View>
          {todayUsage && (
            <Text style={styles.todayReaction}>
              {RATING_EMOJI[todayUsage.rating]}
            </Text>
          )}
          <Text style={styles.expandArrow}>{expanded ? '▾' : '▸'}</Text>
        </View>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.productActions}>
          {/* Quick reaction */}
          <Text style={styles.changeStatusLabel}>
            {todayUsage ? "Today's reaction:" : 'Log today:'}
          </Text>
          <View style={styles.reactionRow}>
            {REACTION_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => {
                  onLogUsage(opt.value, reactionNote.trim() || undefined);
                  setReactionNote('');
                }}
                style={[
                  styles.reactionBtn,
                  todayUsage?.rating === opt.value && { backgroundColor: opt.color + '22', borderColor: opt.color },
                ]}
              >
                <Text style={styles.reactionEmoji}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.reactionNoteInput}
            value={reactionNote}
            onChangeText={setReactionNote}
            placeholder="Quick note (optional)"
            placeholderTextColor={Colors.textMuted}
          />

          {/* Status change */}
          <Text style={[styles.changeStatusLabel, { marginTop: Spacing.sm }]}>Change status:</Text>
          <View style={styles.statusPickerRow}>
            {STATUS_OPTIONS.filter((o) => o.value !== status).map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => {
                  onStatusChange(opt.value);
                  setExpanded(false);
                }}
                style={styles.miniStatusBtn}
              >
                <Text style={styles.miniStatusText}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* View history */}
          {usageCount > 0 && (
            <TouchableOpacity onPress={onViewDetail} style={styles.viewHistoryBtn}>
              <Text style={styles.viewHistoryText}>📊 View History ({usageCount})</Text>
            </TouchableOpacity>
          )}

          {/* Delete product */}
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                'Remove Product',
                `Remove "${name}" from your products?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: onDelete },
                ],
              );
            }}
            style={styles.inlineDeleteBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.inlineDeleteText}>🗑 Remove</Text>
          </TouchableOpacity>
        </View>
      )}
    </PixelCard>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    fontFamily: Fonts.pixel,
    fontSize: FontSizes.lg,
    color: Colors.purple,
    marginBottom: Spacing.lg,
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  loadingText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textMuted,
  },

  // Tab row
  tabRow: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: Spacing.xs,
    paddingHorizontal: 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: Colors.purple,
    borderColor: Colors.purple,
  },
  tabBtnText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
  },
  tabBtnTextActive: {
    color: Colors.textOnDark,
  },

  // Sections
  section: {
    marginBottom: Spacing.xl,
  },
  sectionGap: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.textPrimary,
  },

  // Routine
  routineBlock: {
    marginBottom: Spacing.lg,
  },
  routineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  routineLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.textSecondary,
  },
  routineCount: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
  },
  routineCountDone: {
    color: Colors.success,
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

  // Watchlist
  watchlistTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  pill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    maxWidth: '100%',
    flexShrink: 1,
  },
  pillTrigger: {
    backgroundColor: 'rgba(229, 115, 115, 0.1)',
    borderColor: 'rgba(229, 115, 115, 0.3)',
  },
  pillTextTrigger: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.error,
  },
  pillTesting: {
    backgroundColor: 'rgba(255, 183, 77, 0.1)',
    borderColor: 'rgba(255, 183, 77, 0.3)',
  },
  pillTextTesting: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.warning,
  },
  pillSafe: {
    backgroundColor: 'rgba(129, 199, 132, 0.1)',
    borderColor: 'rgba(129, 199, 132, 0.3)',
  },
  pillTextSafe: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.success,
  },
  pillSelected: {
    backgroundColor: Colors.purple,
    borderColor: Colors.purple,
  },
  pillTextSelected: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textOnDark,
  },
  pillDefault: {
    backgroundColor: Colors.cardBackground,
    borderColor: Colors.tabBarBorder,
  },
  pillTextDefault: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
  },
  pillTriggerSmall: {
    backgroundColor: 'rgba(229, 115, 115, 0.08)',
    borderColor: 'rgba(229, 115, 115, 0.2)',
  },
  pillTextTriggerSmall: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.error,
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
    fontSize: FontSizes.bodyMd,
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
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },

  // Severity
  severityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  severityDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  severityNum: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
  },
  severityLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },

  // Reactions
  reactionInputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  reactionInput: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    padding: Spacing.sm,
    color: Colors.textPrimary,
  },
  addReactionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addReactionText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textOnDark,
  },
  reactionList: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  reactionChip: {
    backgroundColor: 'rgba(124, 77, 255, 0.08)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  reactionChipText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.purple,
  },

  // Journal entries
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  entryDate: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
  },
  severityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  severityBadgeText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
  },
  entryDesc: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  entryPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  entryReactions: {
    marginTop: Spacing.sm,
    gap: 2,
  },
  entryReactionText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textMuted,
  },
  emptySubtext: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },

  // Up Next
  upNextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  upNextText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    flex: 1,
  },
  upNextTextDone: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  upNextRemove: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    padding: Spacing.xs,
  },
  upNextInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  upNextInput: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    padding: Spacing.sm,
    color: Colors.textPrimary,
  },
  upNextAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upNextAddText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textOnDark,
  },

  // Products
  productGroup: {
    marginBottom: Spacing.lg,
  },
  productGroupTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
  },
  productNotes: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  expandArrow: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
  },
  productActions: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.tabBarBorder,
  },
  changeStatusLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  statusPickerRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  statusOption: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    alignItems: 'center',
  },
  statusOptionActive: {
    borderColor: Colors.purple,
    backgroundColor: 'rgba(124, 77, 255, 0.08)',
  },
  statusOptionText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
  },
  statusOptionTextActive: {
    color: Colors.purple,
  },
  miniStatusBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
  },
  miniStatusText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  modalTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  modalInput: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    padding: Spacing.md,
    color: Colors.textPrimary,
  },

  // Product photo scanning
  productPhotoSection: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  productPhotoHint: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.purple,
    marginBottom: Spacing.sm,
  },
  productPhotoButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  productPhotoBtn: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.purple,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  productPhotoBtnText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.purple,
  },
  productOrText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  productScanningWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  productScanningText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.purple,
  },
  productPhotoPreview: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  productPreviewImage: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  productRetakeText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.purple,
    textDecorationLine: 'underline',
  },
  productErrorText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  productTriggerWarning: {
    backgroundColor: '#fff3e0',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  productTriggerText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: '#e65100',
  },
  productNotesInput: {
    marginTop: Spacing.sm,
    minHeight: 60,
    textAlignVertical: 'top',
  },

  // Plan tab
  planHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  calendarToggle: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
  },
  calendarToggleText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.purple,
  },
  phaseCheckinText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    fontStyle: 'italic',
  },

  // Product meta row
  productMeta: {
    gap: Spacing.xs,
  },
  testingDays: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.warning,
  },
  usageCount: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
  },
  todayReaction: {
    fontSize: 18,
    marginRight: Spacing.xs,
  },

  // Reaction row
  reactionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  reactionBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    backgroundColor: Colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionEmoji: {
    fontSize: 22,
  },
  reactionNoteInput: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.cardBackground,
  },
  viewHistoryBtn: {
    marginTop: Spacing.sm,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.tabBarBorder,
  },
  viewHistoryText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.purple,
  },

  // Product detail modal
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  detailClose: {
    fontSize: 20,
    color: Colors.textMuted,
    padding: Spacing.xs,
  },
  detailNotes: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  detailTestingBadge: {
    backgroundColor: 'rgba(255, 183, 77, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 183, 77, 0.3)',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  detailTestingText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.warning,
  },
  detailSummary: {
    marginBottom: Spacing.md,
  },
  detailSummaryTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  detailBarRow: {
    flexDirection: 'row',
    height: 28,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    gap: Spacing.xs,
  },
  detailBar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
  },
  detailBarText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textOnDark,
  },
  detailLogSection: {
    marginTop: Spacing.sm,
  },
  detailLogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.tabBarBorder,
    gap: Spacing.sm,
  },
  detailLogDate: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    width: 60,
  },
  detailLogEmoji: {
    fontSize: 16,
  },
  detailLogNote: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    flex: 1,
  },

  deleteProductBtn: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.tabBarBorder,
  },
  deleteProductText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.error,
  },
  inlineDeleteBtn: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.tabBarBorder,
  },
  inlineDeleteText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.error,
  },

  // Routine editing
  routineHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  routineEditBtn: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.purple,
  },
  editReorderBtns: {
    flexDirection: 'column',
    alignItems: 'center',
    marginRight: Spacing.sm,
    gap: 2,
  },
  reorderArrow: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  reorderArrowDisabled: {
    color: Colors.tabBarBorder,
  },
  editRemoveBtn: {
    fontSize: 18,
    color: Colors.error,
    paddingHorizontal: Spacing.sm,
  },
  addRoutineStepBtn: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.purple,
    borderStyle: 'dashed',
    padding: Spacing.md,
    alignItems: 'center',
  },
  addRoutineStepText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.purple,
  },
  productPickerStatus: {
    fontSize: 16,
    marginLeft: Spacing.sm,
  },
});
