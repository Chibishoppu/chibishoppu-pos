import { useEffect, useState } from 'react';
import { fetchProductImage } from '../services/db';

/**
 * Product image blob → object URL cache.
 * One URL per product, shared app-wide; call invalidateProductImage after
 * saving/replacing/deleting an image so stale URLs don't linger.
 */
const urlCache = new Map<string, string>();

export function invalidateProductImage(productId: string): void {
  const url = urlCache.get(productId);
  if (url) URL.revokeObjectURL(url);
  urlCache.delete(productId);
}

export function clearProductImageCache(): void {
  urlCache.forEach((url) => URL.revokeObjectURL(url));
  urlCache.clear();
}

/**
 * Returns the object URL for a product's stored image, or null if none.
 * Safe for lists — repeated mounts reuse the cached URL.
 */
export function useProductImage(productId: string): string | null {
  const [url, setUrl] = useState<string | null>(urlCache.get(productId) || null);

  useEffect(() => {
    const cached = urlCache.get(productId);
    if (cached !== undefined) {
      setUrl(cached || null);
      return;
    }
    let alive = true;
    fetchProductImage(productId).then((blob) => {
      const u = blob ? URL.createObjectURL(blob) : '';
      urlCache.set(productId, u);
      if (alive) setUrl(u || null);
    });
    return () => {
      alive = false;
    };
  }, [productId]);

  return url;
}
