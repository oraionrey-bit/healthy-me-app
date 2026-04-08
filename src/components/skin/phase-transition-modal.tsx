import React, { useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { PixelButton } from '../ui';
import type { Phase, RoutineStep } from '../../types/skin-plan';

interface PhaseTransitionModalProps {
  visible: boolean;
  currentPhase: Phase;
  nextPhase: Phase | null;
  onAdvance: () => void;
  onStay: () => void;
}

export function PhaseTransitionModal({
  visible,
  currentPhase,
  nextPhase,
  onAdvance,
  onStay,
}: PhaseTransitionModalProps) {
  // Find new products in next phase
  const newProducts = useMemo(() => {
    if (!nextPhase) return [];
    const currentIds = new Set([
      ...currentPhase.amRoutine.map((s) => s.product.id),
      ...currentPhase.pmRoutine.map((s) => s.product.id),
    ]);
    const allNext = [...nextPhase.amRoutine, ...nextPhase.pmRoutine];
    const seen = new Set<string>();
    return allNext.filter((s) => {
      if (currentIds.has(s.product.id) || seen.has(s.product.id)) return false;
      seen.add(s.product.id);
      return true;
    });
  }, [currentPhase, nextPhase]);

  if (!nextPhase) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onStay}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onStay}>
        <TouchableOpacity style={styles.content} activeOpacity={1} onPress={() => {}}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={onStay}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>🎯 Ready for Phase {nextPhase.order}?</Text>
            <Text style={styles.subtitle}>{nextPhase.name}</Text>

            {/* Criteria checklist */}
            <View style={styles.criteriaSection}>
              <Text style={styles.sectionLabel}>Transition Criteria</Text>
              {currentPhase.transitionCriteria.conditions.map((cond, i) => (
                <View key={`cond-${i}`} style={styles.criteriaRow}>
                  <Text style={styles.criteriaIcon}>☐</Text>
                  <Text style={styles.criteriaText}>{cond.description}</Text>
                </View>
              ))}
              <Text style={styles.minDays}>
                Minimum {currentPhase.transitionCriteria.minDays} days in current phase
              </Text>
            </View>

            {/* New products */}
            {newProducts.length > 0 && (
              <View style={styles.newSection}>
                <Text style={styles.sectionLabel}>✨ New Products</Text>
                {newProducts.map((s) => (
                  <View key={s.product.id} style={styles.productRow}>
                    <Text style={styles.productName}>{s.product.name}</Text>
                    {s.product.brand && (
                      <Text style={styles.productBrand}>{s.product.brand}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Buttons */}
            <View style={styles.buttons}>
              <PixelButton title="Stay" variant="outline" onPress={onStay} />
              <PixelButton title={`Advance to Phase ${nextPhase.order}`} onPress={onAdvance} />
            </View>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  content: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    zIndex: 1,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: Colors.textMuted,
  },
  title: {
    fontFamily: Fonts.pixel,
    fontSize: FontSizes.md,
    color: Colors.purple,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  criteriaSection: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  criteriaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  criteriaIcon: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 2,
  },
  criteriaText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
    flex: 1,
  },
  minDays: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
  newSection: {
    marginBottom: Spacing.lg,
  },
  productRow: {
    backgroundColor: 'rgba(124, 77, 255, 0.06)',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  productName: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.purple,
  },
  productBrand: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
});
