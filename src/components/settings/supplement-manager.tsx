import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { PixelButton } from '../ui';
import type { UserSupplement } from '../../types/database';

interface SupplementManagerProps {
  supplements: UserSupplement[];
  loading: boolean;
  onAdd: (name: string, dosage: string, timeOfDay: string) => Promise<void>;
  onUpdate: (id: string, updates: { supplement_name?: string; dosage?: string; time_of_day?: string; is_active?: boolean }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const TIME_OPTIONS = [
  { value: 'morning', label: '☀️ Morning' },
  { value: 'evening', label: '🌙 Evening' },
];

interface SupplementFormData {
  name: string;
  dosage: string;
  timeOfDay: string;
}

function SupplementForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial?: SupplementFormData;
  onSubmit: (data: SupplementFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [dosage, setDosage] = useState(initial?.dosage ?? '');
  const [selectedTimes, setSelectedTimes] = useState<Set<string>>(() => {
    const initialTod = initial?.timeOfDay ?? 'morning';
    return new Set(initialTod.split(','));
  });
  const [saving, setSaving] = useState(false);

  const toggleTime = (value: string) => {
    setSelectedTimes((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        if (next.size > 1) next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  };

  const timeOfDay = ['morning', 'evening'].filter((t) => selectedTimes.has(t)).join(',');

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), dosage: dosage.trim(), timeOfDay });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.form}>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g., Vitamin D"
          placeholderTextColor={Colors.textMuted}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Dosage</Text>
        <TextInput
          style={styles.input}
          value={dosage}
          onChangeText={setDosage}
          placeholder="e.g., 500mg, 1 scoop"
          placeholderTextColor={Colors.textMuted}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Time of Day</Text>
        <View style={styles.timeRow}>
          {TIME_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.timePill, selectedTimes.has(opt.value) && styles.timePillActive]}
              onPress={() => toggleTime(opt.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.timePillText, selectedTimes.has(opt.value) && styles.timePillTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.formButtons}>
        <PixelButton title="Cancel" variant="outline" onPress={onCancel} />
        <PixelButton
          title={saving ? 'Saving...' : submitLabel}
          onPress={handleSubmit}
          disabled={saving || !name.trim()}
          loading={saving}
        />
      </View>
    </View>
  );
}

function SupplementRow({
  supplement,
  onEdit,
  onDelete,
}: {
  supplement: UserSupplement;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const handleDelete = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(`Remove "${supplement.supplement_name}"?`)) {
        onDelete();
      }
    } else {
      Alert.alert(
        'Remove Supplement',
        `Remove "${supplement.supplement_name}" from your list?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: onDelete },
        ],
      );
    }
  };

  return (
    <View style={styles.suppRow}>
      <View style={styles.suppInfo}>
        <Text style={styles.suppName}>{supplement.supplement_name}</Text>
        <Text style={styles.suppDetails}>
          {supplement.dosage ?? '—'} · {supplement.time_of_day.includes('morning') && supplement.time_of_day.includes('evening') ? '☀️🌙 Both' : supplement.time_of_day.includes('morning') ? '☀️ Morning' : '🌙 Evening'}
        </Text>
      </View>
      <View style={styles.suppActions}>
        <TouchableOpacity style={styles.editBtn} onPress={onEdit} activeOpacity={0.7}>
          <Text style={styles.editBtnText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.7}>
          <Text style={styles.deleteBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function SupplementManager({
  supplements,
  loading,
  onAdd,
  onUpdate,
  onDelete,
}: SupplementManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const editingSupplement = editingId
    ? supplements.find((s) => s.id === editingId)
    : null;

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={Colors.purple} />
      </View>
    );
  }

  return (
    <View>
      {/* Supplement List */}
      {supplements.length === 0 && !showAddForm && (
        <Text style={styles.emptyText}>No supplements added yet</Text>
      )}

      {supplements.map((supp) =>
        editingId === supp.id ? (
          <SupplementForm
            key={supp.id}
            initial={{
              name: supp.supplement_name,
              dosage: supp.dosage ?? '',
              timeOfDay: supp.time_of_day,
            }}
            submitLabel="Save Changes"
            onSubmit={async (data) => {
              await onUpdate(supp.id, {
                supplement_name: data.name,
                dosage: data.dosage,
                time_of_day: data.timeOfDay,
              });
              setEditingId(null);
            }}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <SupplementRow
            key={supp.id}
            supplement={supp}
            onEdit={() => {
              setEditingId(supp.id);
              setShowAddForm(false);
            }}
            onDelete={() => onDelete(supp.id)}
          />
        ),
      )}

      {/* Add Form */}
      {showAddForm ? (
        <SupplementForm
          submitLabel="Add Supplement"
          onSubmit={async (data) => {
            await onAdd(data.name, data.dosage, data.timeOfDay);
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      ) : (
        <View style={styles.addButtonWrap}>
          <PixelButton
            title="+ Add Supplement"
            variant="outline"
            onPress={() => {
              setShowAddForm(true);
              setEditingId(null);
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },

  // Supplement rows
  suppRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(179, 136, 255, 0.1)',
  },
  suppInfo: {
    flex: 1,
  },
  suppName: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
  },
  suppDetails: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  suppActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.softPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: {
    fontSize: 14,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.softPink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.error,
  },

  // Form
  form: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
  },
  fieldGroup: {
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  input: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    padding: Spacing.md,
  },
  timeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  timePill: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    alignItems: 'center',
  },
  timePillActive: {
    backgroundColor: Colors.purple,
    borderColor: Colors.purple,
  },
  timePillText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
  },
  timePillTextActive: {
    color: Colors.textOnDark,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  addButtonWrap: {
    marginTop: Spacing.md,
  },
});
