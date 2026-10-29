/**
 * Utilities for client-side image compression and gallery handling.
 * Compresses images using HTML5 Canvas to keep Firestore document sizes small (<50KB),
 * preventing quota exhaustion while enabling instant offline-compatible uploads.
 */

export interface ImageCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'Por favor, seleciona um ficheiro de imagem válido (JPG, PNG, WEBP).' };
  }

  // Maximum original upload size limit: 20MB
  if (file.size > 20 * 1024 * 1024) {
    return { valid: false, error: 'A imagem original é demasiado pesada (máx 20MB).' };
  }

  return { valid: true };
}

export function compressImageFile(
  file: File,
  options: ImageCompressionOptions = {}
): Promise<string> {
  const { maxWidth = 500, maxHeight = 500, quality = 0.82 } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Falha ao ler o ficheiro selecionado da galeria.'));
    };

    reader.onload = (event) => {
      const src = event.target?.result as string;
      const img = new Image();

      img.onerror = () => {
        reject(new Error('Não foi possível carregar a imagem.'));
      };

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Maintain aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }

        // Draw smoothed image
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convert to optimized JPEG data URL
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };

      img.src = src;
    };

    reader.readAsDataURL(file);
  });
}
