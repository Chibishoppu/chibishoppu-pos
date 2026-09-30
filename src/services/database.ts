/**
 * Dexie (IndexedDB) database for Chibishoppu POS.
 *
 * This replaces both localStorage and the previous Electron/SQLite setup.
 * Works identically in browser (PWA) and Capacitor (Android WebView).
 *
 * Schema:
 *  - products: catalogue items (indexed by id, sku, category)
 *  - transactions: sale records (indexed by id, timestamp, status)
 *  - eventConfig: singleton row (id=1) of booth/event settings
 *  - cart: singleton row (id=1) of persisted active cart
 */
import Dexie, { Table } from 'dexie';
import { Product, Transaction, EventConfig, CartItem } from '../types';

// ---------------------------------------------------------------------------
// Table interfaces (for type-safe Dexie queries)
// ---------------------------------------------------------------------------
interface ProductTable extends Product {}
interface TransactionTable extends Transaction {}
interface EventConfigTable extends EventConfig {
  id: number; // always 1 (singleton)
}
interface CartTable {
  id: number; // always 1 (singleton)
  items: CartItem[];
}
interface ImageTable {
  productId: string; // primary key — one image per product
  blob: Blob;
}

// ---------------------------------------------------------------------------
// Database class
// ---------------------------------------------------------------------------
class ChibishoppuDatabase extends Dexie {
  products!: Table<ProductTable, string>;
  transactions!: Table<TransactionTable, string>;
  eventConfig!: Table<EventConfigTable, number>;
  cart!: Table<CartTable, number>;
  images!: Table<ImageTable, string>;

  constructor() {
    super('ChibishoppuPOS');

    this.version(1).stores({
      // Primary key + indexed properties (comma-separated, no commas for non-indexed)
      products: 'id, sku, category, name',
      transactions: 'id, timestamp, status, paymentMethod',
      eventConfig: 'id',
      cart: 'id',
    });

    // v2: product images stored as blobs in their own table so product-list
    // queries never pay the blob cost.
    this.version(2).stores({
      images: 'productId',
    });

    // v3: event sessions — every transaction gets an eventId so reports can
    // scope per event. Pre-existing rows belonged to the single event that
    // was configured at the time, so they inherit the current config's id.
    this.version(3).upgrade(async (tx) => {
      const cfg = await tx.table('eventConfig').get(1);
      const eventId = cfg?.eventId || `evt-${Date.now().toString(36)}`;
      if (cfg && !cfg.eventId) {
        await tx.table('eventConfig').put({ ...cfg, eventId });
      }
      await tx.table('transactions').toCollection().modify((t: { eventId?: string }) => {
        if (!t.eventId) t.eventId = eventId;
      });
    });
  }
}

export const db = new ChibishoppuDatabase();

// ---------------------------------------------------------------------------
// Seeding (first run only)
// ---------------------------------------------------------------------------
import { INITIAL_EVENT_CONFIG } from '../data/initialData';

/**
 * Seeds the database on first run with default booth settings only.
 * No demo products or sample transactions — the app starts empty so you
 * can register your own real products via the Inventory tab.
 *
 * Called on app startup. Safe to call every time — checks first.
 */
export async function seedDatabaseIfEmpty(): Promise<void> {
  const configCount = await db.eventConfig.count();
  if (configCount > 0) return; // already initialized

  await db.eventConfig.put({ ...INITIAL_EVENT_CONFIG, id: 1 });
}

/**
 * Wipes ALL data and starts fresh (empty products, empty transactions,
 * default booth settings). Used by the "Clear All Data" button.
 */
export async function resetDatabase(): Promise<void> {
  await db.transaction('rw', db.products, db.transactions, db.eventConfig, db.cart, db.images, async () => {
    await db.products.clear();
    await db.transactions.clear();
    await db.eventConfig.clear();
    await db.cart.clear();
    await db.images.clear();

    // Restore default booth settings only
    await db.eventConfig.put({ ...INITIAL_EVENT_CONFIG, id: 1 });
  });
}
