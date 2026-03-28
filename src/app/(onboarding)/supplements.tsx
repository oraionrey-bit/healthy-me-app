import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { PixelButton } from '../../components/ui';
import { OnboardingCard } from '../../components/onboarding/onboarding-card';
import { ProgressDots } from '../../components/onboarding/progress-dots';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

interface DefaultSupplement {
  supplement_name: string;
  dosage: string;
  time_of_day: string;
  sort_order: number;
}

const DEFAULT_SUPPLEMENTS: DefaultSupplement[] = [
  { supplement_name: 'Ovasitol (AM)', dosage: '1 scoop', time_of_day: 'morning', sort_order: 0 },
  { supplement_name: 'Knowell', dosage: '4 caps', time_of_day: 'morning', sort_order: 1 },
  { supplement_name: 'NAC', dosage: '500mg', time_of_day: 'morning', sort_order: 2 },
  { supplement_name: 'Omega-3', dosage: '4 softgels', time_of_day: 'morning', sort_order: 3 },
  { supplement_name: 'Ovasitol (PM)', dosage: '1 scoop', time_of_day: 'evening', sort_order: 4 },
  { supplement_name: 'BionerLab Gummies', dosage: '2 gummies', time_of_day: 'evening', sort_order: 5 },
];

export default function SupplementsScreen() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<Set<number>>(
    new Set(DEFAULT_SUPPLEMENTS.map((_, i) => i)),
  );
  const [saving, setSaving] = useState(false);

  const toggleItem = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleNext = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Delete any existing supplements (from auto-seed) before inserting chosen ones
      await supabase.from('user_supplements').delete().eq('user_id', user.id);

      const chosenSupplements = DEFAULT_SUPPLEMENTS.filter((_, i) => selected.has(i));
      if (chosenSupplements.length > 0) {
        const rows = chosenSupplements.map((s) => ({
          user_id: user.id,
          supplement_name: s.supplement_name,
          dosage: s.dosage,
          frequency: 'daily',
          time_of_day: s.time_of_day,
          notes: null,
          is_active: true,
          sort_order: s.sort_order,
        }));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js generic mismatch
        await (supabase.from('user_supplements') as any).insert(rows);
      }

      router.push('/(onboarding)/complete');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>◀ Back</Text>
          </TouchableOpacity>

          <OnboardingCard>
            <Text style={styles.title}>SUPPLEMENTS 💊</Text>
            <Text style={styles.helper}>
              Common PCOS supplements pre-selected. Uncheck any you don&apos;t take.
            </Text>

            <View style={styles.list}>
              {DEFAULT_SUPPLEMENTS.map((supp, i) => {
                const isSelected = selected.has(i);
                return (
                  <TouchableOpacity
                    key={supp.supplement_name}
                    onPress={() => toggleItem(i)}
                    style={[styles.checkRow, isSelected && styles.checkRowActive]}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <View style={styles.suppInfo}>
                      <Text style={[styles.suppName, isSelected && styles.suppNameActive]}>
                        {supp.supplement_name}
                      </Text>
                      <Text style={styles.suppDose}>
                        {supp.dosage} · {supp.time_of_day === 'morning' ? '☀️ AM' : '🌙 PM'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.tip}>
              ℹ️ Pre-selected based on common PCOS protocols. You can add custom supplements later in settings.
            </Text>

            <PixelButton
              title={saving ? 'Saving...' : 'Next →'}
              onPress={handleNext}
              disabled={saving}
            />
          </OnboardingCard>

          <ProgressDots current={4} total={5} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
  },
  backText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.purple,
  },
  title: {
    fontFamily: Fonts.pixel,
    fontSize: FontSizes.lg,
    color: Colors.purple,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  helper: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  list: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    padding: Spacing.md,
  },
  checkRowActive: {
    backgroundColor: 'rgba(124, 77, 255, 0.06)',
    borderColor: 'rgba(124, 77, 255, 0.3)',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  checkboxChecked: {
    backgroundColor: Colors.purple,
    borderColor: Colors.purple,
  },
  checkmark: {
    fontFamily: Fonts.body,
    fontSize: 8,
    color: Colors.textOnDark,
  },
  suppInfo: {
    flex: 1,
  },
  suppName: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
  },
  suppNameActive: {
    color: Colors.purple,
  },
  suppDose: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  tip: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    fontStyle: 'italic',
  },
});
