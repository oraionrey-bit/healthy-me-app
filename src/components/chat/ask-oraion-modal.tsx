import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { PixelButton } from '../ui/pixel-button';
import { PixelCard } from '../ui/pixel-card';
import { AnalysisTypePills } from './analysis-type-pills';
import { FoodAnalysisCard } from './food-analysis-card';
import { useChatTunnel } from '../../hooks/use-chat-tunnel';
import type { ChatMessageType, FoodAnalysis } from '../../types/database';

interface AskOraionModalProps {
  visible: boolean;
  onClose: () => void;
}

type PhotoAsset = {
  uri: string;
  name: string;
  type: string;
};

export function AskOraionModal({ visible, onClose }: AskOraionModalProps) {
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [description, setDescription] = useState('');
  const [messageType, setMessageType] = useState<ChatMessageType>('food_analysis');
  const { sendAnalysis, sendChat, response, sending, error, clearResponse } = useChatTunnel();
  const [showTimeout, setShowTimeout] = useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Start/clear timeout when sending state changes
  React.useEffect(() => {
    if (sending) {
      setShowTimeout(false);
      timeoutRef.current = setTimeout(() => setShowTimeout(true), 30000);
    } else {
      setShowTimeout(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [sending]);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newPhotos: PhotoAsset[] = result.assets.map((asset, idx) => ({
        uri: asset.uri,
        name: asset.fileName || `photo-${idx}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      }));
      setPhotos((prev) => [...prev, ...newPhotos].slice(0, 5));
    }
  }, []);

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setPhotos((prev) =>
        [
          ...prev,
          {
            uri: asset.uri,
            name: asset.fileName || 'camera-photo.jpg',
            type: asset.mimeType || 'image/jpeg',
          },
        ].slice(0, 5),
      );
    }
  }, []);

  const removePhoto = useCallback((idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSend = useCallback(async () => {
    if (photos.length > 0) {
      await sendAnalysis({ photos, description, messageType });
    } else if (description.trim()) {
      await sendChat(description);
    }
  }, [photos, description, messageType, sendAnalysis, sendChat]);

  const handleClose = useCallback(() => {
    setPhotos([]);
    setDescription('');
    setMessageType('food_analysis');
    clearResponse();
    onClose();
  }, [clearResponse, onClose]);

  const hasResponse = response !== null;
  const analysisData = response?.analysis as FoodAnalysis | null;
  const isFoodAnalysis =
    response?.message_type === 'food_analysis' && analysisData && analysisData.calories != null;

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <Text style={styles.title}>📸 Ask Oraion</Text>
              <TouchableOpacity onPress={handleClose}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentInner}
            showsVerticalScrollIndicator={false}
          >
            {/* Response View */}
            {hasResponse ? (
              <View>
                {isFoodAnalysis && analysisData ? (
                  <FoodAnalysisCard analysis={analysisData} />
                ) : (
                  <PixelCard>
                    <Text style={styles.responseLabel}>⚡ Oraion says:</Text>
                    <Text style={styles.responseText}>{response.content}</Text>
                  </PixelCard>
                )}
                <PixelButton title="Ask Again" onPress={() => clearResponse()} variant="outline" />
              </View>
            ) : (
              <>
                {/* Analysis Type */}
                <Text style={styles.sectionLabel}>What are you analyzing?</Text>
                <AnalysisTypePills selected={messageType} onSelect={setMessageType} />

                {/* Photo Selection */}
                <Text style={[styles.sectionLabel, { marginTop: Spacing.md }]}>
                  {photos.length > 0 ? `Photos (${photos.length}/5)` : 'Add Photos'}
                </Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                  <View style={styles.photoRow}>
                    {photos.map((photo, idx) => (
                      <View key={photo.uri} style={styles.photoWrapper}>
                        <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                        <TouchableOpacity
                          style={styles.photoRemove}
                          onPress={() => removePhoto(idx)}
                        >
                          <Text style={styles.photoRemoveText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                    {photos.length < 5 && (
                      <View style={styles.addPhotoButtons}>
                        <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImage}>
                          <Text style={styles.addPhotoEmoji}>🖼️</Text>
                          <Text style={styles.addPhotoLabel}>Gallery</Text>
                        </TouchableOpacity>
                        {Platform.OS !== 'web' && (
                          <TouchableOpacity style={styles.addPhotoBtn} onPress={takePhoto}>
                            <Text style={styles.addPhotoEmoji}>📷</Text>
                            <Text style={styles.addPhotoLabel}>Camera</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                </ScrollView>

                {/* Description */}
                <Text style={[styles.sectionLabel, { marginTop: Spacing.md }]}>
                  Description (optional)
                </Text>
                <TextInput
                  style={styles.input}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="What did you eat? Any details..."
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  maxLength={5000}
                />

                {/* Error */}
                {error && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>⚠️ {error}</Text>
                  </View>
                )}

                {/* Send Button */}
                {sending ? (
                  <View style={styles.analyzingBox}>
                    <ActivityIndicator color={Colors.purple} size="small" />
                    <Text style={styles.analyzingText}>Oraion is analyzing...</Text>
                    {showTimeout ? (
                      <>
                        <Text style={styles.timeoutText}>
                          Taking longer than usual... You can close this and check back later.
                        </Text>
                        <PixelButton title="Close" variant="outline" onPress={handleClose} />
                      </>
                    ) : (
                      <Text style={styles.analyzingSubtext}>This may take a moment ✨</Text>
                    )}
                  </View>
                ) : (
                  <PixelButton
                    title={photos.length > 0 ? '⚡ Analyze' : '💬 Send to Oraion'}
                    onPress={handleSend}
                    disabled={photos.length === 0 && !description.trim()}
                  />
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '85%',
    ...Shadows.card,
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.tabBarBorder,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  title: {
    fontFamily: Fonts.pixel,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
  },
  closeBtn: {
    fontSize: 20,
    color: Colors.textMuted,
    padding: Spacing.xs,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  sectionLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  photoScroll: {
    flexGrow: 0,
  },
  photoRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  photoWrapper: {
    position: 'relative',
  },
  photoPreview: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.softPurple,
  },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveText: {
    color: Colors.textOnDark,
    fontSize: 12,
    fontWeight: 'bold',
  },
  addPhotoButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  addPhotoBtn: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.lavender,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardBackgroundTranslucent,
  },
  addPhotoEmoji: {
    fontSize: 24,
    marginBottom: 2,
  },
  addPhotoLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
  },
  input: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    padding: Spacing.sm,
    minHeight: 60,
    maxHeight: 120,
    textAlignVertical: 'top',
    marginBottom: Spacing.md,
  },
  errorBox: {
    backgroundColor: Colors.softPink,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.error,
  },
  analyzingBox: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.xs,
  },
  analyzingText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.purple,
    marginTop: Spacing.sm,
  },
  analyzingSubtext: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
  },
  timeoutText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  responseLabel: {
    fontFamily: Fonts.pixel,
    fontSize: FontSizes.xs,
    color: Colors.purple,
    marginBottom: Spacing.sm,
  },
  responseText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
});
