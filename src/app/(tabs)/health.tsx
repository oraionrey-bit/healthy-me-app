import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  Colors,
  Fonts,
  FontSizes,
  Spacing,
  BorderRadius,
} from '../../constants/theme';
import { ScreenWrapper, PixelCard, PixelButton } from '../../components/ui';
import { useSupplements } from '../../hooks/use-supplements';
import { useWeight } from '../../hooks/use-weight';

function SupplementItem({
  name,
  dosage,
  timeOfDay,
  taken,
  onToggle,
}: {
  name: string;
  dosage: string | null;
  timeOfDay: string;
  taken: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.7}>
      <View style={[suppStyles.row, taken && suppStyles.rowTaken]}>
        <View style={[suppStyles.checkbox, taken && suppStyles.checkboxTaken]}>
          {taken && <Text style={suppStyles.checkmark}>✓</Text>}
        </View>
        <View style={suppStyles.info}>
          <Text style={[suppStyles.name, taken && suppStyles.nameTaken]}>
            {name}
          </Text>
          <Text style={suppStyles.detail}>
            {dosage ? `${dosage} · ` : ''}
            {timeOfDay}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function SupplementsSection() {
  const {
    supplements,
    takenCount,
    totalCount,
    loading,
    isSupplementTaken,
    toggleSupplement,
  } = useSupplements();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.purple} />
      </View>
    );
  }

  if (supplements.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Supplements</Text>
        <PixelCard>
          <Text style={styles.emptyText}>No supplements added yet</Text>
          <View style={styles.emptyButtonWrap}>
            <PixelButton title="Add Supplement" onPress={() => {}} variant="outline" />
          </View>
        </PixelCard>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Supplements</Text>
        <Text style={styles.progressText}>
          {takenCount}/{totalCount}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width:
                totalCount > 0
                  ? `${(takenCount / totalCount) * 100}%`
                  : '0%',
            },
          ]}
        />
      </View>

      <View style={styles.listGap}>
        {supplements.map((supp) => (
          <SupplementItem
            key={supp.id}
            name={supp.supplement_name}
            dosage={supp.dosage}
            timeOfDay={supp.time_of_day}
            taken={isSupplementTaken(supp.id)}
            onToggle={() =>
              toggleSupplement(supp.id, !isSupplementTaken(supp.id))
            }
          />
        ))}
      </View>
    </View>
  );
}

function WeightSection() {
  const { lastWeight, loading, logWeight } = useWeight();
  const [weightInput, setWeightInput] = useState('');
  const [saving, setSaving] = useState(false);

  const handleLog = async () => {
    const num = parseFloat(weightInput);
    if (isNaN(num) || num <= 0) return;
    setSaving(true);
    try {
      await logWeight(num);
      setWeightInput('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Weight</Text>
      <PixelCard>
        {lastWeight && !loading ? (
          <View style={styles.lastWeightRow}>
            <Text style={styles.lastWeightLabel}>Last logged</Text>
            <Text style={styles.lastWeightValue}>
              {lastWeight.weight} lbs
            </Text>
            <Text style={styles.lastWeightDate}>{lastWeight.log_date}</Text>
          </View>
        ) : null}

        <View style={styles.weightInputRow}>
          <TextInput
            style={styles.weightInput}
            placeholder="Weight"
            placeholderTextColor={Colors.textMuted}
            value={weightInput}
            onChangeText={setWeightInput}
            keyboardType="decimal-pad"
          />
          <Text style={styles.weightUnit}>lbs</Text>
          <PixelButton
            title="Log"
            onPress={handleLog}
            loading={saving}
            disabled={!weightInput.trim()}
          />
        </View>
      </PixelCard>
    </View>
  );
}

export default function HealthScreen() {
  return (
    <ScreenWrapper scrollable>
      <Text style={styles.header}>🔬 Health</Text>
      <SupplementsSection />
      <WeightSection />
    </ScreenWrapper>
  );
}

const suppStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    padding: Spacing.md,
  },
  rowTaken: {
    backgroundColor: 'rgba(129, 199, 132, 0.08)',
    borderColor: 'rgba(129, 199, 132, 0.3)',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  checkboxTaken: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  checkmark: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textOnDark,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.textPrimary,
  },
  nameTaken: {
    color: Colors.textSecondary,
  },
  detail: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    marginTop: 2,
  },
});

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
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  progressText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.success,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.softPurple,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.full,
  },
  listGap: {
    gap: Spacing.sm,
  },
  loadingContainer: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  emptyButtonWrap: {
    alignItems: 'center',
  },
  lastWeightRow: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  lastWeightLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
  },
  lastWeightValue: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.xl,
    color: Colors.textPrimary,
    marginVertical: Spacing.xs,
  },
  lastWeightDate: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
  },
  weightInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  weightInput: {
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
  },
  weightUnit: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textMuted,
  },
});
