import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { CHAT_RELAY_URL } from '../../constants/chat';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

const CHAT_TOKEN = process.env.EXPO_PUBLIC_CHAT_TOKEN ?? '';

// ── Result types per mode ──────────────────────────────────────────────

export interface SkincareResult {
  name?: string;
  brand?: string;
  ingredients?: string[];
  product_type?: string;
  triggers_found?: string[];
  notes?: string;
}

export interface FoodResult {
  name?: string;
  brand?: string;
  serving_size?: string;
  serving_unit?: string;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
}

export interface SupplementResult {
  name?: string;
  brand?: string;
  dosage?: string;
  ingredients?: { name: string; amount: string }[];
  form?: string;
  pcos_notes?: string;
}

export type ProductAnalyzerMode = 'skincare' | 'food' | 'supplement';

type ResultMap = {
  skincare: SkincareResult;
  food: FoodResult;
  supplement: SupplementResult;
};

// Map mode to the relay message_type
const MODE_TO_MESSAGE_TYPE: Record<ProductAnalyzerMode, string> = {
  skincare: 'skincare_product',
  food: 'nutrition_label',
  supplement: 'supplement_product',
};

const MODE_LABELS: Record<ProductAnalyzerMode, { hint: string; scanning: string; description: string }> = {
  skincare: {
    hint: 'Scan product label to auto-fill',
    scanning: 'Analyzing product...',
    description: 'Analyze this skincare product',
  },
  food: {
    hint: 'Scan nutrition label to auto-fill',
    scanning: 'Reading nutrition label...',
    description: 'Read this nutrition label',
  },
  supplement: {
    hint: 'Scan supplement label to auto-fill',
    scanning: 'Analyzing supplement...',
    description: 'Analyze this supplement label',
  },
};

// ── Props ──────────────────────────────────────────────────────────────

interface ProductAnalyzerProps<M extends ProductAnalyzerMode> {
  mode: M;
  onResult: (data: ResultMap[M]) => void;
  onError?: (error: string) => void;
  /** Render when no photo has been taken yet (alongside the camera/gallery buttons) */
  compact?: boolean;
}

// ── Component ──────────────────────────────────────────────────────────

export function ProductAnalyzer<M extends ProductAnalyzerMode>({
  mode,
  onResult,
  onError,
  compact,
}: ProductAnalyzerProps<M>) {
  const [scanning, setScanning] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const labels = MODE_LABELS[mode];
  const messageType = MODE_TO_MESSAGE_TYPE[mode];

  const scanLabel = useCallback(
    async (uri: string) => {
      setScanning(true);
      setError(null);
      try {
        if (!CHAT_TOKEN) {
          throw new Error('Analysis service not configured');
        }

        // Convert image URI to File (Safari requires File, not Blob, in FormData)
        let photoFile: Blob;
        try {
          const resp = await fetch(uri);
          const blob = await resp.blob();
          const filename = `${mode}-product.jpg`;
          photoFile = new File([blob], filename, { type: blob.type || 'image/jpeg' });
        } catch {
          throw new Error('Could not read photo — please try again');
        }

        const formData = new FormData();
        formData.append('message_type', messageType);
        formData.append('description', labels.description);
        formData.append('photos', photoFile, `${mode}-product.jpg`);

        let res: Response;
        try {
          res = await fetch(`${CHAT_RELAY_URL}/analyze`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${CHAT_TOKEN}` },
            body: formData,
          });
        } catch {
          throw new Error('Analysis service unavailable — check your connection');
        }

        if (res.status === 401) throw new Error('Analysis service auth error — please update the app');
        if (!res.ok) throw new Error(`Analysis failed (${res.status}) — try again`);

        const data = await res.json();
        const messageId = data.id as string;

        // Poll Supabase for AI response (max 35s). Stop early if the relay marks
        // the request terminal-error; otherwise the UI misleadingly spins until
        // timeout even when the server already knows manual entry is needed.
        const start = Date.now();
        while (Date.now() - start < 35000) {
          await new Promise((r) => setTimeout(r, 2500));
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: original } = await (supabase.from('chat_messages') as any)
            .select('status')
            .eq('id', messageId)
            .single();

          if (original?.status === 'error' || original?.status === 'failed') {
            throw new Error('Photo analysis could not finish — please enter it manually');
          }
          if (original?.status !== 'complete') continue;

          // Fetch AI response
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: aiReply } = await (supabase.from('chat_messages') as any)
            .select('content')
            .eq('message_type', messageType)
            .eq('direction', 'oraion')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (aiReply?.content) {
            const text = String(aiReply.content);
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]) as ResultMap[M];
              onResult(parsed);
              return;
            }
            throw new Error('Could not parse product data');
          }
        }
        throw new Error('Timed out — try entering manually');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to scan product';
        setError(msg);
        onError?.(msg);
      } finally {
        setScanning(false);
      }
    },
    [messageType, labels.description, mode, onResult, onError],
  );

  const pickPhoto = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setPhotoUri(uri);
      await scanLabel(uri);
    }
  }, [scanLabel]);

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      const msg = 'Camera permission needed';
      setError(msg);
      onError?.(msg);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setPhotoUri(uri);
      await scanLabel(uri);
    }
  }, [scanLabel, onError]);

  const reset = useCallback(() => {
    setPhotoUri(null);
    setError(null);
    setScanning(false);
  }, []);

  // ── Render ──

  if (scanning) {
    return (
      <View style={styles.scanningWrap}>
        <ActivityIndicator size="small" color={Colors.purple} />
        <Text style={styles.scanningText}>{labels.scanning}</Text>
      </View>
    );
  }

  if (photoUri) {
    return (
      <View style={styles.previewWrap}>
        <Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="contain" />
        <TouchableOpacity onPress={reset}>
          <Text style={styles.retakeText}>Retake photo</Text>
        </TouchableOpacity>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }

  return (
    <View style={compact ? styles.compactWrap : styles.photoSection}>
      <Text style={styles.hint}>{labels.hint}</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity onPress={takePhoto} style={styles.photoBtn}>
          <Text style={styles.photoBtnText}>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={pickPhoto} style={styles.photoBtn}>
          <Text style={styles.photoBtnText}>Gallery</Text>
        </TouchableOpacity>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  photoSection: {
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  compactWrap: {
    gap: Spacing.xs,
  },
  hint: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  photoBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
  },
  photoBtnText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.purple,
  },
  scanningWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  scanningText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.textSecondary,
  },
  previewWrap: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  previewImage: {
    width: 200,
    height: 150,
    borderRadius: BorderRadius.md,
  },
  retakeText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodySm,
    color: Colors.purple,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.bodyXs,
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
