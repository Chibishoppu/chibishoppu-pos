/**
 * Local JSON backup & restore for ChibishoppuPOS.
 *
 * Completely offline: export produces a .json file generated in the browser;
 * import reads it back through a file picker. No API, no upload, no cloud.
 *
 * Format (backupVersion 1):
 *   { backupVersion, appName, appVersion, createdAt, counts, data }
 *   data = { products, transactions, eventConfig, cart, images }
 *
 * Non-JSON-native values handled explicitly:
 *   - images table holds Blob objects → serialized as base64 + mime
 *   - money fields are plain numbers in storage → JSON preserves them exactly
 *   - dates are stored as ISO strings → preserved verbatim
 *
 * Restore semantics: REPLACE the whole local database inside a single Dexie
 * transaction. An in-memory snapshot of the current DB is taken first; if the
 * restore fails, we attempt to re-apply that snapshot so the DB is never left
 * half-restored.
 */
import { db } from './database';
import { Product, Transaction, EventConfig, CartItem } from '../types';
import { INITIAL_EVENT_CONFIG } from '../data/initialData';

export const BACKUP_VERSION = 1;
const BACKUP_APP_NAME = 'ChibishoppuPOS';

// ---------------------------------------------------------------------------
// Backup file types
// ---------------------------------------------------------------------------
interface BackupImage {
  productId: string;
  mime: string;
  b64: string;
}

interface BackupData {
  products: Product[];
  transactions: Transaction[];
  eventConfig: Omit<EventConfig, never> | null; // stored without the singleton id
  cart: CartItem[];
  images: BackupImage[];
}

export interface BackupFile {
  backupVersion: number;
  appName: string;
  appVersion: string;
  createdAt: string;
  counts: {
    products: number;
    transactions: number;
    images: number;
    cartItems: number;
  };
  data: BackupData;
}

export type BackupValidation =
  | { ok: true; backup: BackupFile }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Blob <-> base64 helpers (images table)
// ---------------------------------------------------------------------------
async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < buf.length; i += CHUNK) {
    bin += String.fromCharCode(...buf.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// ---------------------------------------------------------------------------
// Create backup
// ---------------------------------------------------------------------------
/** Reads every table and builds the versioned backup object. */
export async function createBackup(): Promise<BackupFile> {
  const [products, transactions, configRow, cartRow, imageRows] = await Promise.all([
    db.products.toArray(),
    db.transactions.toArray(),
    db.eventConfig.get(1),
    db.cart.get(1),
    db.images.toArray(),
  ]);

  const images: BackupImage[] = [];
  for (const row of imageRows) {
    images.push({
      productId: row.productId,
      mime: row.blob.type || 'image/jpeg',
      b64: await blobToBase64(row.blob),
    });
  }

  const eventConfig = configRow ? (() => { const { id: _id, ...cfg } = configRow; return cfg; })() : null;
  const cart = cartRow?.items ?? [];

  return {
    backupVersion: BACKUP_VERSION,
    appName: BACKUP_APP_NAME,
    appVersion: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'unknown',
    createdAt: new Date().toISOString(),
    counts: {
      products: products.length,
      transactions: transactions.length,
      images: images.length,
      cartItems: cart.length,
    },
    data: { products, transactions, eventConfig, cart, images },
  };
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------
/** Serializes the backup and triggers a browser download. */
export function downloadBackup(backup: BackupFile): void {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = backup.createdAt.slice(0, 10);
  a.href = url;
  a.download = `chibishoppu-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Validate
// ---------------------------------------------------------------------------
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Parses raw JSON text and validates it as a ChibishoppuPOS backup.
 * Never throws — returns a user-friendly error string instead.
 */
export function parseAndValidateBackup(text: string): BackupValidation {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This file is not valid JSON.' };
  }

  if (!isRecord(raw)) {
    return { ok: false, error: 'This file is not a valid backup.' };
  }
  if (raw.appName !== BACKUP_APP_NAME) {
    return { ok: false, error: 'This backup is not a ChibishoppuPOS backup.' };
  }
  if (typeof raw.backupVersion !== 'number') {
    return { ok: false, error: 'This backup is missing its format version.' };
  }
  if (raw.backupVersion !== BACKUP_VERSION) {
    return {
      ok: false,
      error: 'This backup was created with a newer backup format that this version of ChibishoppuPOS cannot restore.',
    };
  }
  if (typeof raw.createdAt !== 'string' || Number.isNaN(Date.parse(raw.createdAt))) {
    return { ok: false, error: 'This backup appears to be incomplete or corrupted.' };
  }
  if (!isRecord(raw.data)) {
    return { ok: false, error: 'This backup appears to be incomplete or corrupted.' };
  }

  const data = raw.data;
  if (!Array.isArray(data.products) || !Array.isArray(data.transactions)) {
    return { ok: false, error: 'This backup appears to be incomplete or corrupted.' };
  }
  // Basic record-shape checks — don't blindly trust arbitrary JSON
  for (const p of data.products) {
    if (!isRecord(p) || typeof p.id !== 'string' || typeof p.name !== 'string') {
      return { ok: false, error: 'This backup appears to be incomplete or corrupted.' };
    }
  }
  for (const t of data.transactions) {
    if (!isRecord(t) || typeof t.id !== 'string' || typeof t.receiptNumber !== 'string' || typeof t.total !== 'number') {
      return { ok: false, error: 'This backup appears to be incomplete or corrupted.' };
    }
  }
  if (data.images !== undefined) {
    if (!Array.isArray(data.images)) return { ok: false, error: 'This backup appears to be incomplete or corrupted.' };
    for (const img of data.images) {
      if (!isRecord(img) || typeof img.productId !== 'string' || typeof img.b64 !== 'string') {
        return { ok: false, error: 'This backup appears to be incomplete or corrupted.' };
      }
    }
  }
  if (data.eventConfig !== undefined && data.eventConfig !== null && !isRecord(data.eventConfig)) {
    return { ok: false, error: 'This backup appears to be incomplete or corrupted.' };
  }
  if (data.cart !== undefined && !Array.isArray(data.cart)) {
    return { ok: false, error: 'This backup appears to be incomplete or corrupted.' };
  }

  return { ok: true, backup: raw as unknown as BackupFile };
}

// ---------------------------------------------------------------------------
// Restore
// ---------------------------------------------------------------------------
/** Writes a validated backup into the DB inside one transaction (all-or-nothing). */
async function applyBackup(backup: BackupFile): Promise<void> {
  const { products, transactions, eventConfig, cart, images } = backup.data;

  await db.transaction(
    'rw',
    [db.products, db.transactions, db.eventConfig, db.cart, db.images],
    async () => {
      await db.products.clear();
      await db.transactions.clear();
      await db.eventConfig.clear();
      await db.cart.clear();
      await db.images.clear();

      if (products.length) await db.products.bulkPut(products);
      if (transactions.length) await db.transactions.bulkPut(transactions);
      await db.eventConfig.put({ ...(eventConfig ?? INITIAL_EVENT_CONFIG), id: 1 });
      await db.cart.put({ id: 1, items: cart ?? [] });
      if (images?.length) {
        await db.images.bulkPut(
          images.map((img) => ({ productId: img.productId, blob: base64ToBlob(img.b64, img.mime || 'image/jpeg') }))
        );
      }
    }
  );
}

/**
 * Replaces the current local database with the backup's contents.
 * Snapshots the current DB in memory first; if the restore fails, the
 * snapshot is re-applied so no data is silently lost.
 */
export async function restoreBackup(backup: BackupFile): Promise<void> {
  const emergency = await createBackup();
  try {
    await applyBackup(backup);
  } catch (err) {
    console.error('[backup] restore failed, rolling back:', err);
    try {
      await applyBackup(emergency);
    } catch (rollbackErr) {
      console.error('[backup] rollback also failed:', rollbackErr);
    }
    throw new Error('RESTORE_FAILED');
  }
}
