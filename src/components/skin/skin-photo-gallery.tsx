import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { PixelButton } from '../ui';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import type { SkinPhoto } from '../../types/database';

interface SkinPhotoGalleryProps {
  photos: SkinPhoto[];
  onDelete?: (photoId: string) => void;
}

function PhotoCard({
  photo,
  onPress,
}: {
  photo: SkinPhoto;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.photoCard} activeOpacity={0.8}>
      <View style={styles.photoWrap}>
        <img
          src={photo.photo_url}
          alt={photo.notes ?? 'Skin photo'}
          style={{
            width: '100%',
            height: 120,
            objectFit: 'cover',
            borderRadius: 8,
          }}
        />
        <View style={styles.dateTag}>
          <Text style={styles.dateTagText}>
            {new Date(photo.photo_date + 'T00:00:00').toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>
      </View>
      {photo.notes && (
        <Text style={styles.photoNotes} numberOfLines={1}>
          {photo.notes}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export function SkinPhotoGallery({ photos, onDelete }: SkinPhotoGalleryProps) {
  const [selectedPhotos, setSelectedPhotos] = useState<[SkinPhoto, SkinPhoto | null]>([photos[0], null]);
  const [compareMode, setCompareMode] = useState(false);
  const [detailPhoto, setDetailPhoto] = useState<SkinPhoto | null>(null);

  if (photos.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyEmoji}>📷</Text>
        <Text style={styles.emptyText}>No skin photos yet</Text>
        <Text style={styles.emptySubtext}>Track your progress with photos</Text>
      </View>
    );
  }

  const handlePhotoPress = (photo: SkinPhoto) => {
    if (compareMode) {
      // In compare mode, select photos for side-by-side
      setSelectedPhotos((prev) => {
        if (!prev[0] || prev[0].id === photo.id) return [photo, prev[1]];
        if (!prev[1] || prev[1].id === photo.id) return [prev[0], photo];
        return [prev[0], photo]; // Replace second
      });
    } else {
      setDetailPhoto(photo);
    }
  };

  return (
    <View style={styles.container}>
      {/* Compare toggle */}
      <View style={styles.headerRow}>
        <Text style={styles.photoCount}>{photos.length} photo{photos.length !== 1 ? 's' : ''}</Text>
        <TouchableOpacity
          onPress={() => {
            setCompareMode(!compareMode);
            if (!compareMode && photos.length >= 2) {
              setSelectedPhotos([photos[photos.length - 1], photos[0]]);
            }
          }}
          style={[styles.compareBtn, compareMode && styles.compareBtnActive]}
        >
          <Text style={[styles.compareBtnText, compareMode && styles.compareBtnTextActive]}>
            {compareMode ? '✕ Exit Compare' : '⇆ Compare'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Compare view */}
      {compareMode && selectedPhotos[0] && selectedPhotos[1] && (
        <View style={styles.compareContainer}>
          <View style={styles.comparePhoto}>
            <img
              src={selectedPhotos[0].photo_url}
              alt="Before"
              style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 8 }}
            />
            <Text style={styles.compareLabel}>
              {new Date(selectedPhotos[0].photo_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>
          <View style={styles.comparePhoto}>
            <img
              src={selectedPhotos[1].photo_url}
              alt="After"
              style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 8 }}
            />
            <Text style={styles.compareLabel}>
              {new Date(selectedPhotos[1].photo_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>
        </View>
      )}

      {compareMode && (!selectedPhotos[0] || !selectedPhotos[1]) && (
        <Text style={styles.compareHint}>Tap two photos to compare side-by-side</Text>
      )}

      {/* Photo grid */}
      <View style={styles.grid}>
        {photos.map((photo) => (
          <PhotoCard key={photo.id} photo={photo} onPress={() => handlePhotoPress(photo)} />
        ))}
      </View>

      {/* Detail modal */}
      <Modal
        visible={!!detailPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailPhoto(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {detailPhoto && (
              <ScrollView>
                <img
                  src={detailPhoto.photo_url}
                  alt={detailPhoto.notes ?? 'Skin photo'}
                  style={{ width: '100%', maxHeight: 400, objectFit: 'contain', borderRadius: 12 }}
                />
                <View style={styles.modalInfo}>
                  <Text style={styles.modalDate}>
                    {new Date(detailPhoto.photo_date + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                  {detailPhoto.angle && (
                    <Text style={styles.modalAngle}>Angle: {detailPhoto.angle}</Text>
                  )}
                  {detailPhoto.notes && (
                    <Text style={styles.modalNotes}>{detailPhoto.notes}</Text>
                  )}
                </View>
                <View style={styles.modalActions}>
                  {onDelete && (
                    <PixelButton
                      title="🗑️ Delete"
                      variant="outline"
                      onPress={() => {
                        onDelete(detailPhoto.id);
                        setDetailPhoto(null);
                      }}
                    />
                  )}
                  <PixelButton title="Close" onPress={() => setDetailPhoto(null)} />
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoCount: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
  },
  compareBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
  },
  compareBtnActive: {
    backgroundColor: Colors.purple,
    borderColor: Colors.purple,
  },
  compareBtnText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
  },
  compareBtnTextActive: {
    color: Colors.textOnDark,
  },
  compareContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  comparePhoto: {
    flex: 1,
    gap: Spacing.xs,
  },
  compareLabel: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  compareHint: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  photoCard: {
    width: '48%',
    gap: Spacing.xs,
  },
  photoWrap: {
    position: 'relative',
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  dateTag: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dateTagText: {
    fontFamily: Fonts.pixel,
    fontSize: 6,
    color: '#fff',
  },
  photoNotes: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textMuted,
  },
  emptySubtext: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 430,
    maxHeight: '90%',
  },
  modalInfo: {
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  modalDate: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyMd,
    color: Colors.textPrimary,
  },
  modalAngle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
  },
  modalNotes: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
});
