import React from 'react';
import {
  Text,
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { PixelButton } from '../components/ui';
import { useAuth } from '../lib/auth';
import { useUserProfile } from '../hooks/use-user-profile';
import { useSupplements } from '../hooks/use-supplements';
import { SupplementManager } from '../components/settings/supplement-manager';
import { useOura } from '../hooks/use-oura';
import { useExportData, EXPORT_SHEETS } from '../hooks/use-export-data';
import { WeightEntry } from '../components/health/weight-entry';
import { useWeight } from '../hooks/use-weight';

// Pixel art icons for section headers
const SECTION_ICONS: Record<string, ImageSourcePropType> = {
  profile: require('../../assets/images/icons/profile.png'),
  target: require('../../assets/images/icons/target.png'),
  pill: require('../../assets/images/icons/pill.png'),
  ring: require('../../assets/images/icons/ring.png'),
  scale: require('../../assets/images/icons/scale.png'),
  chart: require('../../assets/images/icons/chart.png'),
  lock: require('../../assets/images/icons/lock.png'),
};

const PCOS_TYPE_LABELS: Record<string, string> = {
  insulin_resistant: 'Insulin Resistant',
  post_pill: 'Post-Pill',
  inflammatory: 'Inflammatory',
  adrenal: 'Adrenal',
  unsure: 'Unsure',
};

function SettingsSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: ImageSourcePropType;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        {icon && (
          <Image source={icon} style={styles.sectionIcon} />
        )}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value ?? '—'}</Text>
    </View>
  );
}

const HIDE_WEIGHTS_KEY = 'healthy-me-hide-weights';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { profile, loading } = useUserProfile();

  // Weight privacy toggle — persists across reloads in localStorage (web).
  const [weightsHidden, setWeightsHidden] = React.useState<boolean>(() => {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(HIDE_WEIGHTS_KEY) === '1';
  });
  React.useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(HIDE_WEIGHTS_KEY, weightsHidden ? '1' : '0');
  }, [weightsHidden]);
  const {
    supplements,
    loading: supplementsLoading,
    addSupplement,
    updateSupplement,
    deleteSupplement,
  } = useSupplements();
  const { isConnected: ouraConnected, loading: ouraLoading, connectOura, disconnectOura, syncing: ouraSyncing, syncOura } = useOura();
  const {
    loading: exportLoading,
    error: exportError,
    success: exportSuccess,
    exportData,
    selectedSheets: exportSelectedSheets,
    toggleSheet: exportToggleSheet,
  } = useExportData(user?.id);
  const { recentWeights } = useWeight();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.purple} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const pcosLabel = profile?.pcos_type
    ? PCOS_TYPE_LABELS[profile.pcos_type] ?? profile.pcos_type
    : null;

  const heightDisplay = profile?.height_cm
    ? `${profile.height_cm} cm`
    : null;

  const weightDisplay = profile?.current_weight
    ? `${profile.current_weight} ${profile.weight_unit ?? 'lbs'}`
    : null;

  const goalWeightDisplay = profile?.goal_weight
    ? `${profile.goal_weight} ${profile.weight_unit ?? 'lbs'}`
    : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.maxWidthWrap}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>SETTINGS</Text>
            <View style={styles.backButton} />
          </View>

          {/* Profile */}
          <SettingsSection title="Profile" icon={SECTION_ICONS.profile}>
            <InfoRow label="Name" value={profile?.display_name} />
            <InfoRow label="Email" value={user?.email} />
            <InfoRow label="Health Focus" value={profile?.health_condition === 'pcos' ? 'PCOS' : profile?.health_condition ?? 'General'} />
            {profile?.health_condition === 'pcos' && (
              <InfoRow label="PCOS Type" value={pcosLabel} />
            )}
            <InfoRow label="Age" value={profile?.age} />
            <InfoRow label="Height" value={heightDisplay} />
            <InfoRow label="Weight" value={weightDisplay} />
            <View style={styles.editButtonWrap}>
              <PixelButton
                title="Edit Profile"
                variant="outline"
                onPress={() => router.push('/(onboarding)/profile')}
              />
            </View>
          </SettingsSection>

          {/* Targets */}
          <SettingsSection title="Targets" icon={SECTION_ICONS.target}>
            <InfoRow
              label="Calorie Target"
              value={profile?.calorie_target ? `${profile.calorie_target} cal` : null}
            />
            <InfoRow
              label="Protein Target"
              value={profile?.protein_target ? `${profile.protein_target}g` : null}
            />
            <InfoRow label="Goal Weight" value={goalWeightDisplay} />
            <View style={styles.editButtonWrap}>
              <PixelButton
                title="Edit Targets"
                variant="outline"
                onPress={() => router.push('/(onboarding)/goals')}
              />
            </View>
          </SettingsSection>

          {/* Supplements */}
          <SettingsSection title="Supplements" icon={SECTION_ICONS.pill}>
            <Text style={styles.sectionDescription}>
              Manage your daily supplement checklist
            </Text>
            <SupplementManager
              supplements={supplements}
              loading={supplementsLoading}
              onAdd={addSupplement}
              onUpdate={updateSupplement}
              onDelete={deleteSupplement}
            />
          </SettingsSection>

          {/* Oura Ring */}
          <SettingsSection title="Oura Ring" icon={SECTION_ICONS.ring}>
            {ouraLoading ? (
              <ActivityIndicator color={Colors.purple} />
            ) : ouraConnected ? (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Status</Text>
                  <Text style={[styles.infoValue, { color: Colors.success }]}>Connected ✓</Text>
                </View>
                <View style={styles.editButtonWrap}>
                  <PixelButton
                    title={ouraSyncing ? 'Syncing...' : 'Sync Now'}
                    variant="outline"
                    onPress={() => syncOura()}
                    disabled={ouraSyncing}
                  />
                </View>
                <View style={styles.editButtonWrap}>
                  <PixelButton
                    title="Disconnect"
                    variant="secondary"
                    onPress={disconnectOura}
                  />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.sectionDescription}>
                  Connect your Oura Ring to track sleep, readiness, HRV, and activity automatically.
                </Text>
                <View style={styles.editButtonWrap}>
                  <PixelButton
                    title="Connect Oura Ring"
                    onPress={connectOura}
                  />
                </View>
              </>
            )}
          </SettingsSection>

          {/* Weight */}
          <SettingsSection title="Weight" icon={SECTION_ICONS.scale}>
            <TouchableOpacity
              onPress={() => setWeightsHidden(!weightsHidden)}
              style={styles.privacyToggle}
              activeOpacity={0.7}
            >
              <Text style={styles.privacyToggleText}>
                {weightsHidden
                  ? '🙈 Weights hidden — tap to show'
                  : '👀 Weights visible — tap to hide'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.sectionDescription}>
              Log your daily weight to track progress over time.
            </Text>
            {!weightsHidden && <WeightEntry />}
            {!weightsHidden && recentWeights.length > 0 && (
              <View style={styles.weightHistory}>
                <Text style={styles.weightHistoryTitle}>Recent Entries</Text>
                {recentWeights.map((entry) => (
                  <View key={entry.id} style={styles.weightHistoryRow}>
                    <Text style={styles.weightHistoryDate}>
                      {new Date(entry.log_date + 'T00:00:00').toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                    <Text style={styles.weightHistoryValue}>{entry.weight} lbs</Text>
                  </View>
                ))}
              </View>
            )}
            {weightsHidden && (
              <Text style={styles.privacyHidden}>
                ••• Weight entry + history hidden. Tap above to reveal.
              </Text>
            )}
          </SettingsSection>

          {/* Data */}
          <SettingsSection title="Data" icon={SECTION_ICONS.chart}>
            <Text style={styles.sectionDescription}>
              Export your health data as a CSV file.
            </Text>
            <View style={styles.sheetSelector}>
              {EXPORT_SHEETS.map(({ key, label }) => {
                const checked = exportSelectedSheets.has(key);
                return (
                  <TouchableOpacity
                    key={key}
                    style={styles.sheetCheckRow}
                    onPress={() => exportToggleSheet(key)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[styles.sheetCheckbox, checked && styles.sheetCheckboxActive]}
                    >
                      {checked && <Text style={styles.sheetCheckmark}>✓</Text>}
                    </View>
                    <Text style={styles.sheetLabel}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.editButtonWrap}>
              {exportLoading ? (
                <ActivityIndicator color={Colors.purple} />
              ) : (
                <PixelButton
                  title={exportSuccess ? '✓ Downloaded!' : '📊 Export Selected (90 days)'}
                  onPress={exportData}
                  variant={exportSuccess ? 'secondary' : 'primary'}
                />
              )}
            </View>
            {exportError != null && (
              <Text style={styles.exportError}>{exportError}</Text>
            )}
          </SettingsSection>

          {/* Account */}
          <SettingsSection title="Account" icon={SECTION_ICONS.lock}>
            <InfoRow label="Email" value={user?.email} />
            <View style={styles.editButtonWrap}>
              <PixelButton
                title="Sign Out"
                variant="secondary"
                onPress={handleSignOut}
              />
            </View>
          </SettingsSection>

          {/* App Info */}
          <View style={styles.appInfo}>
            <Text style={styles.appVersion}>Healthy Me v1.0.0</Text>
            <Text style={styles.appTagline}>Made with 💜 for your health journey</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  maxWidthWrap: {
    width: '100%',
    maxWidth: 430,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 80,
  },
  backText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.purple,
  },
  headerTitle: {
    flex: 1,
    fontFamily: Fonts.pixel,
    fontSize: FontSizes.md,
    color: Colors.purple,
    textAlign: 'center',
  },

  // Sections
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionIcon: {
    width: 20,
    height: 20,
    marginRight: Spacing.xs,
  },
  sectionTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.textPrimary,
  },
  sectionCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.card,
  },
  sectionDescription: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(179, 136, 255, 0.1)',
  },
  infoLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
  },

  // Edit button
  editButtonWrap: {
    marginTop: Spacing.md,
  },

  // Export buttons
  exportButtonSpacer: {
    height: Spacing.sm,
  },

  // Export sheet selector (May 7)
  sheetSelector: {
    marginBottom: Spacing.md,
  },
  sheetCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs + 2,
  },
  sheetCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.lavender,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  sheetCheckboxActive: {
    backgroundColor: Colors.lavender,
    borderColor: Colors.lavender,
  },
  sheetCheckmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  sheetLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
  },

  // Export feedback
  exportSuccess: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.success,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  exportError: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.error,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },

  // Weight privacy toggle (May 7)
  privacyToggle: {
    backgroundColor: Colors.softPurple,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  privacyToggleText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  privacyHidden: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: Spacing.sm,
  },

  // Weight history
  weightHistory: {
    marginTop: Spacing.md,
  },
  weightHistoryTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  weightHistoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(179, 136, 255, 0.08)',
  },
  weightHistoryDate: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
  },
  weightHistoryValue: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
  },

  // App info
  appInfo: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  appVersion: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  appTagline: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.purple,
  },
});
