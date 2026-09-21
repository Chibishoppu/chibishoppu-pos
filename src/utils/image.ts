/**
 * Image helpers for product photos.
 *
 * Uploads are resized to a max edge and re-encoded as JPEG on a white
 * background — keeps blobs ~50-150KB so hundreds of products stay cheap
 * in IndexedDB, and flattens any transparency safely.
 */

const MAX_EDGE = 800;
const JPEG_QUALITY = 0.82;

export async function compressImageToBlob(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Image compression failed'))),
      'image/jpeg',
      JPEG_QUALITY
    );
  });
}
