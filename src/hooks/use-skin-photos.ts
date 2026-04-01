import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { toDateKey } from '../utils/storage';
import type { SkinPhoto } from '../types/database';

interface AddSkinPhotoInput {
  photoFile: File;
  notes?: string;
  angle?: SkinPhoto['angle'];
}

/**
 * Compress an image file to stay under maxSizeKB using canvas resize.
 * Returns a Blob (JPEG) that fits within the size limit.
 */
async function compressImage(file: File, maxSizeKB = 4000): Promise<Blob> {
  if (file.size <= maxSizeKB * 1024) return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      const maxDim = 2048;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);

      const tryQuality = (quality: number) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return; }
            if (blob.size <= maxSizeKB * 1024 || quality <= 0.3) {
              resolve(blob);
            } else {
              tryQuality(quality - 0.1);
            }
          },
          'image/jpeg',
          quality,
        );
      };
      tryQuality(0.85);
    };
    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = URL.createObjectURL(file);
  });
}

export function useSkinPhotos() {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<SkinPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchPhotos = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('skin_photos')
        .select('*')
        .eq('user_id', user.id)
        .order('photo_date', { ascending: false });

      if (error) throw error;
      setPhotos((data as SkinPhoto[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const addPhoto = useCallback(
    async (input: AddSkinPhotoInput) => {
      if (!user) return;
      setUploading(true);
      try {
        const today = toDateKey(new Date());
        const timestamp = Date.now();

        // Compress image
        const compressed = await compressImage(input.photoFile, 4000);

        // Upload to storage
        const filePath = `${user.id}/${today}/${timestamp}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('skin-photos')
          .upload(filePath, compressed, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Get signed URL (private bucket)
        const { data: signedData, error: signedError } = await supabase.storage
          .from('skin-photos')
          .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year

        if (signedError) throw signedError;
        const photoUrl = signedData.signedUrl;

        // Insert record
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: insertError } = await (supabase.from('skin_photos') as any).insert({
          user_id: user.id,
          photo_date: today,
          photo_url: photoUrl,
          angle: input.angle ?? null,
          acne_severity: null,
          notes: input.notes ?? null,
        });

        if (insertError) throw insertError;
        await fetchPhotos();
      } finally {
        setUploading(false);
      }
    },
    [user, fetchPhotos],
  );

  const deletePhoto = useCallback(
    async (photoId: string) => {
      if (!user) return;
      const { error } = await supabase
        .from('skin_photos')
        .delete()
        .eq('id', photoId)
        .eq('user_id', user.id);

      if (!error) await fetchPhotos();
    },
    [user, fetchPhotos],
  );

  return {
    photos,
    loading,
    uploading,
    addPhoto,
    deletePhoto,
    refetch: fetchPhotos,
  };
}
