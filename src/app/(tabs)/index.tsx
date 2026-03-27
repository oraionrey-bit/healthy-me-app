import React, { useState } from 'react';
import { Text, View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { ScreenWrapper, PixelCard } from '../../components/ui';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

interface ChecklistItem {
  id: string;
  emoji: string;
  label: string;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: 'ovasitol-am', emoji: '💊', label: 'Ovasitol (morning)' },
  { id: 'ovasitol-pm', emoji: '💊', label: 'Ovasitol (evening)' },
  { id: 'magnesium', emoji: '💊', label: 'Magnesium' },
  { id: 'dairy', emoji: '🥛', label: 'Yogurt / Dairy' },
  { id: 'water', emoji: '💧', label: 'Water' },
];

export default function HomeScreen() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const doneCount = Object.values(checked).filter(Boolean).length;
  const totalCount = CHECKLIST_ITEMS.length;

  return (
    <ScreenWrapper scrollable>
      {/* Date */}
      <View style={styles.header}>
        <Text style={styles.date}>{formatDate()}</Text>
      </View>

      {/* Character */}
      <View style={styles.characterWrap}>
        <Image
          source={require('../../../assets/images/character/character-default.png')}
          style={styles.character}
          resizeMode="contain"
        />
      </View>

      {/* Today's Checklist */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today&apos;s Checklist</Text>
          <Text style={styles.progress}>
            {doneCount}/{totalCount} done
          </Text>
        </View>

        <View style={styles.checklistGap}>
          {CHECKLIST_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => toggle(item.id)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkRow,
                  checked[item.id] && styles.checkRowDone,
                ]}
              >
                <View
                  style={[
                    styles.checkbox,
                    checked[item.id] && styles.checkboxDone,
                  ]}
                >
                  {checked[item.id] && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.checkLabel,
                    checked[item.id] && styles.checkLabelDone,
                  ]}
                >
                  {item.emoji} {item.label}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Today's Food summary */}
      <PixelCard style={styles.foodCard}>
        <View style={styles.foodCardInner}>
          <Image
            source={require('../../../assets/images/character/character-eating.png')}
            style={styles.foodCharacter}
            resizeMode="contain"
          />
          <View style={styles.foodTextWrap}>
            <Text style={styles.foodCardTitle}>Today&apos;s Food</Text>
            <Text style={styles.foodCardEmpty}>No meals logged yet 🍽️</Text>
          </View>
        </View>
      </PixelCard>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  date: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.textSecondary,
  },
  characterWrap: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  character: {
    width: 100,
    height: 100,
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
  },
  progress: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.purple,
  },
  checklistGap: {
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
  checkLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    flex: 1,
  },
  checkLabelDone: {
    color: Colors.textSecondary,
  },
  foodCard: {
    marginBottom: Spacing.lg,
  },
  foodCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  foodCharacter: {
    width: 50,
    height: 50,
    marginRight: Spacing.md,
  },
  foodTextWrap: {
    flex: 1,
  },
  foodCardTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  foodCardEmpty: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
  },
});
