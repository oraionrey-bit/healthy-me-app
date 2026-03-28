import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Modal,
} from 'react-native';
import {
  Colors,
  Fonts,
  FontSizes,
  Spacing,
  BorderRadius,
} from '../../constants/theme';
import { ScreenWrapper, PixelCard, PixelButton } from '../../components/ui';
import { AskOraionFAB, AskOraionModal } from '../../components/chat';
import {
  useSkincare,
  type RoutineStep,
  type ProductStatus,
} from '../../hooks/use-skincare';

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
}: {
  title: string;
  steps: RoutineStep[];
  prefix: string;
  doneCount: number;
  isStepDone: (id: string) => boolean;
  onToggle: (id: string) => void;
}) {
  const allDone = doneCount === steps.length && steps.length > 0;

  return (
    <View style={styles.routineBlock}>
      <View style={styles.routineHeader}>
        <Text style={styles.routineLabel}>{title}</Text>
        <Text
          style={[styles.routineCount, allDone && styles.routineCountDone]}
        >
          {doneCount}/{steps.length}
        </Text>
      </View>
      <View style={styles.listGap}>
        {steps.map((step) => {
          const key = `${prefix}-${step.id}`;
          const done = isStepDone(key);
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
            <Text style={styles.pillTextTrigger}>❌ {t.name}</Text>
          </View>
        ))}
        {testing.map((t) => (
          <View key={t.id} style={[styles.pill, styles.pillTesting]}>
            <Text style={styles.pillTextTesting}>🧪 {t.name}</Text>
          </View>
        ))}
        {safe.slice(0, 4).map((t) => (
          <View key={t.id} style={[styles.pill, styles.pillSafe]}>
            <Text style={styles.pillTextSafe}>✅ {t.name}</Text>
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
  } = useSkincare();

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

  // ── Active section (tab-like) ──
  const [activeSection, setActiveSection] = useState<
    'routine' | 'journal' | 'products'
  >('routine');

  // ── Ask Oraion ──
  const [askOraionVisible, setAskOraionVisible] = useState(false);

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

  const handleAddProduct = async () => {
    if (!newProductName.trim()) return;
    await addProduct(newProductName.trim(), newProductStatus);
    setNewProductName('');
    setNewProductStatus('testing');
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
          />

          {/* PM Routine */}
          <RoutineChecklist
            title="🌙 PM Routine"
            steps={pmSteps}
            prefix="pm"
            doneCount={pmDoneCount}
            isStepDone={isStepDone}
            onToggle={toggleRoutineStep}
          />
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
                    name={p.name}
                    status={p.status}
                    notes={p.notes}
                    onStatusChange={(s) => updateProductStatus(p.id, s)}
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
                    name={p.name}
                    status={p.status}
                    notes={p.notes}
                    onStatusChange={(s) => updateProductStatus(p.id, s)}
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
                    name={p.name}
                    status={p.status}
                    notes={p.notes}
                    onStatusChange={(s) => updateProductStatus(p.id, s)}
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
                <Text style={styles.modalTitle}>Add Product</Text>
                <TextInput
                  style={styles.modalInput}
                  value={newProductName}
                  onChangeText={setNewProductName}
                  placeholder="Product name"
                  placeholderTextColor={Colors.textMuted}
                  autoFocus
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
                <View style={styles.formButtons}>
                  <PixelButton
                    title="Cancel"
                    variant="outline"
                    onPress={() => {
                      setShowAddProduct(false);
                      setNewProductName('');
                    }}
                  />
                  <PixelButton
                    title="Add"
                    onPress={handleAddProduct}
                    disabled={!newProductName.trim()}
                  />
                </View>
              </View>
            </View>
          </Modal>
        </View>
      )}
    </ScreenWrapper>
    <AskOraionFAB onPress={() => setAskOraionVisible(true)} />
    <AskOraionModal visible={askOraionVisible} onClose={() => setAskOraionVisible(false)} />
    </>
  );
}

// ── Product Row Component ──────────────────────────────────────────────

function ProductRow({
  name,
  status,
  notes,
  onStatusChange,
}: {
  name: string;
  status: ProductStatus;
  notes?: string;
  onStatusChange: (s: ProductStatus) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <PixelCard>
      <TouchableOpacity onPress={() => setExpanded(!expanded)}>
        <View style={styles.productRow}>
          <Text style={styles.productIcon}>{STATUS_ICON[status]}</Text>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{name}</Text>
            {notes && <Text style={styles.productNotes}>{notes}</Text>}
          </View>
          <Text style={styles.expandArrow}>{expanded ? '▾' : '▸'}</Text>
        </View>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.productActions}>
          <Text style={styles.changeStatusLabel}>Change status:</Text>
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
    gap: Spacing.sm,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: Colors.purple,
    borderColor: Colors.purple,
  },
  tabBtnText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
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
});
