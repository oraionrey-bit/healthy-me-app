import React, { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';
import { PixelButton } from '../ui';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import type { SkinPhoto } from '../../types/database';

type AngleOption = NonNullable<SkinPhoto['angle']>;

const ANGLE_OPTIONS: Array<{ value: AngleOption; label: string }> = [
  { value: 'front', label: '正面' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'other', label: 'Other' },
];

interface SkinPhotoCaptureProps {
  onCapture: (file: File, notes: string, angle: AngleOption) => Promise<void>;
  uploading: boolean;
}

export function SkinPhotoCapture({ onCapture, uploading }: SkinPhotoCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notes, setNotes] = useState('');
  const [angle, setAngle] = useState<AngleOption>('front');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileSelect = () => {
    if (Platform.OS !== 'web') return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    await onCapture(selectedFile, notes, angle);
    setSelectedFile(null);
    setPreview(null);
    setNotes('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreview(null);
    setNotes('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.unsupported}>Photo capture available on web only</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef as React.RefObject<HTMLInputElement>}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {!selectedFile ? (
        <PixelButton title="📸 Take / Upload Photo" onPress={handleFileSelect} />
      ) : (
        <View style={styles.previewSection}>
          {preview && (
            <View style={styles.previewWrap}>
              <img
                src={preview}
                alt="Preview"
                style={{
                  width: '100%',
                  maxHeight: 200,
                  objectFit: 'cover',
                  borderRadius: 12,
                }}
              />
              {/* Date overlay */}
              <View style={styles.dateOverlay}>
                <Text style={styles.dateOverlayText}>
                  {new Date().toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>
          )}

          {/* Angle selector */}
          <View style={styles.angleRow}>
            {ANGLE_OPTIONS.map((opt) => (
              <View
                key={opt.value}
                style={[styles.anglePill, angle === opt.value && styles.anglePillActive]}
              >
                <Text
                  style={[styles.anglePillText, angle === opt.value && styles.anglePillTextActive]}
                  onPress={() => setAngle(opt.value)}
                >
                  {opt.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Notes */}
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add notes (optional)"
            placeholderTextColor={Colors.textMuted}
          />

          {/* Actions */}
          <View style={styles.actionRow}>
            <PixelButton title="Cancel" variant="outline" onPress={handleCancel} />
            <PixelButton
              title={uploading ? 'Uploading...' : 'Save Photo'}
              onPress={handleUpload}
              disabled={uploading}
              loading={uploading}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  unsupported: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  previewSection: {
    gap: Spacing.md,
  },
  previewWrap: {
    position: 'relative',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  dateOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dateOverlayText: {
    fontFamily: Fonts.pixel,
    fontSize: FontSizes.xs,
    color: '#fff',
  },
  angleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  anglePill: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    alignItems: 'center',
  },
  anglePillActive: {
    backgroundColor: Colors.purple,
    borderColor: Colors.purple,
  },
  anglePillText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
  },
  anglePillTextActive: {
    color: Colors.textOnDark,
  },
  notesInput: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    padding: Spacing.md,
    color: Colors.textPrimary,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
});
