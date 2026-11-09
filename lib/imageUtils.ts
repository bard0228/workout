/**
 * Utility for immediate client-side image compression.
 * Resizes the image to maximum boundaries and compresses as JPEG.
 * Reduces raw mobile photos (4-15MB) down to ~30-60KB base64 strings,
 * preventing storage bloat while maintaining excellent clarity for gym equipment.
 */

export async function compressImage(
  file: File | Blob,
  maxWidth = 200,
  maxHeight = 200,
  quality = 0.6
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('讀取檔案失敗'));
    };

    reader.onload = (e) => {
      const img = new Image();

      img.onerror = () => {
        reject(new Error('載入圖片格式失敗'));
      };

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Proportional resizing
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
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('無法建立 Canvas 繪圖環境'));
          return;
        }

        // Background in case of transparent png
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);

        // Smooth scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(img, 0, 0, width, height);

        // Compress to JPEG data URL
        // 優先 WebP（極小縮圖）；不支援 WebP 編碼的瀏覽器退回 JPEG
        let dataUrl = canvas.toDataURL('image/webp', quality);
        if (!dataUrl.startsWith('data:image/webp')) dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
