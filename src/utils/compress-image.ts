/**
 * Compress an image file to stay under maxSizeKB using canvas resize.
 * Returns a Blob (JPEG) that fits within the size limit.
 */
export async function compressImage(file: File, maxSizeKB = 4000): Promise<Blob> {
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
