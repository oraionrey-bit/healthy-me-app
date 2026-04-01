import React from 'react';
import {
  Text,
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
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

const PCOS_TYPE_LABELS: Record<string, string> = {
  insulin_resistant: 'Insulin Resistant',
  post_pill: 'Post-Pill',
  inflammatory: 'Inflammatory',
  adrenal: 'Adrenal',
  unsure: 'Unsure',
};

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
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

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { profile, loading } = useUserProfile();
  const {
    supplements,
    loading: supplementsLoading,
    addSupplement,
    updateSupplement,
    deleteSupplement,
  } = useSupplements();
  const { isConnected: ouraConnected, loading: ouraLoading, connectOura, disconnectOura, syncing: ouraSyncing, syncOura } = useOura();

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
          <SettingsSection title="👤 Profile">
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
          <SettingsSection title="🎯 Targets">
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
          <SettingsSection title="💊 Supplements">
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
          <SettingsSection title="💍 Oura Ring">
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

          {/* Account */}
          <SettingsSection title="🔒 Account">
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
  sectionTitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyLg,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
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
