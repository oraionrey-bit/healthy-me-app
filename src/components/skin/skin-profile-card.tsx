import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { PixelCard } from '../ui';
import type { SkinProfile } from '../../types/skin-plan';

interface SkinProfileCardProps {
  profile: SkinProfile;
}

export function SkinProfileCard({ profile }: SkinProfileCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <PixelCard>
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
        style={styles.header}
      >
        <Text style={styles.title}>Skin Profile</Text>
        <Text style={styles.toggle}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {/* Always-visible summary row */}
      <View style={styles.summaryRow}>
        <View style={styles.chip}>
          <Text style={styles.chipText}>{profile.skin_type || 'Unknown'}</Text>
        </View>
        {profile.pcos_flag && (
          <View style={[styles.chip, styles.chipAccent]}>
            <Text style={[styles.chipText, styles.chipAccentText]}>PCOS</Text>
          </View>
        )}
        {profile.fitzpatrick ? (
          <View style={styles.chip}>
            <Text style={styles.chipText}>{profile.fitzpatrick}</Text>
          </View>
        ) : null}
      </View>

      {expanded && (
        <View style={styles.details}>
          {/* Concerns */}
          {profile.skin_concerns.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Concerns</Text>
              <View style={styles.chipRow}>
                {profile.skin_concerns.map((c) => (
                  <View key={c} style={styles.chip}>
                    <Text style={styles.chipText}>{c}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Known Sensitivities */}
          {profile.known_sensitivities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Sensitivities</Text>
              {profile.known_sensitivities.map((s) => (
                <Text key={s.ingredient} style={styles.detailText}>
                  {s.ingredient} — {s.reaction}
                </Text>
              ))}
            </View>
          )}

          {/* Known Triggers */}
          {profile.known_triggers.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Triggers</Text>
              {profile.known_triggers.map((t) => (
                <Text key={t.trigger} style={styles.detailText}>
                  {t.trigger} — {t.symptom}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
    </PixelCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
  },
  toggle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  chip: {
    backgroundColor: Colors.background,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  chipAccent: {
    backgroundColor: Colors.softPurple,
  },
  chipText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
  },
  chipAccentText: {
    color: Colors.purple,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  details: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  section: {
    gap: Spacing.xs,
  },
  sectionLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textPrimary,
  },
  detailText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
    paddingLeft: Spacing.sm,
  },
});
