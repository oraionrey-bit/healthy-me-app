import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { toDateKey } from '../utils/storage';
import { compressImage } from '../utils/compress-image';
import type { SkinPhoto } from '../types/database';

interface AddSkinPhotoInput {
  photoFile: File;
  notes?: string;
  angle?: SkinPhoto['angle'];
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
