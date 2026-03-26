import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  Colors,
  Fonts,
  FontSizes,
  Spacing,
  BorderRadius,
} from '../../constants/theme';
import { ScreenWrapper, PixelCard } from '../../components/ui';

// Hardcoded for MVP — Tina's actual products
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

function RoutineChecklist({
  title,
  items,
  checked,
  onToggle,
}: {
  title: string;
  items: string[];
  checked: Record<string, boolean>;
  onToggle: (item: string) => void;
}) {
  return (
    <View style={styles.routineBlock}>
      <Text style={styles.routineLabel}>{title}</Text>
      <View style={styles.listGap}>
        {items.map((item) => (
          <TouchableOpacity
            key={item + title}
            onPress={() => onToggle(item + title)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.checkRow,
                checked[item + title] && styles.checkRowDone,
              ]}
            >
              <View
                style={[
                  styles.checkbox,
                  checked[item + title] && styles.checkboxDone,
                ]}
              >
                {checked[item + title] && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
              <Text
                style={[
                  styles.checkText,
                  checked[item + title] && styles.checkTextDone,
                ]}
              >
                {item}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function SkinScreen() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <ScreenWrapper scrollable>
      <Text style={styles.header}>🧴 Skin</Text>

      {/* My Routine */}
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

      {/* Safe Products */}
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

      {/* Triggers */}
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
    fontFamily: Fonts.pixel,
    fontSize: FontSizes.lg,
    color: Colors.purple,
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontFamily: Fonts.pixel,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  routineBlock: {
    marginBottom: Spacing.md,
  },
  routineLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
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
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
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
    fontFamily: Fonts.pixel,
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
