/**
 * Data service layer — all DB operations go through here.
 *
 * Uses Dexie (IndexedDB) under the hood. Works identically in:
 *  - Browser (PWA on Windows)
 *  - Capacitor WebView (Android tablet)
 *
 * All methods are async. Call from React components/hooks.
 */
import { db, seedDatabaseIfEmpty, resetDatabase } from './database';
import { Product, Transaction, EventConfig, CartItem, RefundItemDetail } from '../types';
import { INITIAL_EVENT_CONFIG } from '../data/initialData';

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------
/**
 * Seeds the DB on first run. Call once at app startup before loading data.
 */
export async function initializeDatabase(): Promise<void> {
  await seedDatabaseIfEmpty();
  // Ask the browser/OS to keep our IndexedDB data (products, images) persistent
  // instead of evictable under storage pressure. Fire-and-forget — may be denied.
  try {
    await navigator.storage?.persist?.();
  } catch {
    /* non-critical */
  }
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------
export async function fetchProducts(): Promise<Product[]> {
  const rows = await db.products.toArray();
  // Sort by insertion order (Dexie returns by primary key; we want newest first)
  return rows.reverse();
}

export async function saveProduct(product: Product): Promise<Product[]> {
  await db.products.put(product);
  return fetchProducts();
}

/** Bulk insert/update products (CSV import). Rows already validated upstream. */
export async function bulkSaveProducts(items: Product[]): Promise<Product[]> {
  await db.transaction('rw', db.products, async () => {
    await db.products.bulkPut(items);
  });
  return fetchProducts();
}

export async function removeProduct(id: string): Promise<Product[]> {
  await db.transaction('rw', db.products, db.images, async () => {
    await db.products.delete(id);
    await db.images.delete(id);
  });
  return fetchProducts();
}

// ---------------------------------------------------------------------------
// Product Images (separate table — blobs keyed by productId)
// ---------------------------------------------------------------------------
export async function saveProductImage(productId: string, blob: Blob): Promise<void> {
  await db.images.put({ productId, blob });
}

export async function fetchProductImage(productId: string): Promise<Blob | null> {
  const rec = await db.images.get(productId);
  return rec?.blob ?? null;
}

export async function deleteProductImage(productId: string): Promise<void> {
  await db.images.delete(productId);
}

export async function restockBatch(updates: { id: string; addQty: number }[]): Promise<Product[]> {
  await db.transaction('rw', db.products, async () => {
    for (const u of updates) {
      const prod = await db.products.get(u.id);
      if (prod) {
        await db.products.put({ ...prod, stock: prod.stock + u.addQty });
      }
    }
  });
  return fetchProducts();
}

export async function deductStock(
  items: { productId: string; quantity: number }[]
): Promise<Product[]> {
  await db.transaction('rw', db.products, async () => {
    for (const item of items) {
      if (!item.productId) continue;
      const prod = await db.products.get(item.productId);
      if (prod) {
        await db.products.put({ ...prod, stock: Math.max(0, prod.stock - item.quantity) });
      }
    }
  });
  return fetchProducts();
}

/**
 * Restocks refunded items. Restockable units return to sellable stock;
 * defective units are counted in product.defectiveStock instead.
 */
export async function processRefundRestock(
  items: { productId: string; restockQty: number; defectiveQty: number }[]
): Promise<Product[]> {
  await db.transaction('rw', db.products, async () => {
    for (const item of items) {
      if (!item.productId) continue;
      const prod = await db.products.get(item.productId);
      if (prod) {
        await db.products.put({
          ...prod,
          stock: prod.stock + Math.max(0, item.restockQty),
          defectiveStock: (prod.defectiveStock ?? 0) + Math.max(0, item.defectiveQty),
        });
      }
    }
  });
  return fetchProducts();
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------
export async function fetchTransactions(): Promise<Transaction[]> {
  const rows = await db.transactions.orderBy('timestamp').reverse().toArray();
  return rows;
}

export async function addTransaction(t: Transaction): Promise<Transaction[]> {
  await db.transactions.put(t);
  return fetchTransactions();
}

/**
 * Marks a transaction as refunded and stores refund metadata
 * (timestamp, reason, processing cashier, per-item defect counts).
 */
export async function refundTransaction(
  id: string,
  meta: {
    refundedAt: string;
    refundReason: string;
    refundedBy: string;
    refundDetails: RefundItemDetail[];
  }
): Promise<Transaction[]> {
  const tx = await db.transactions.get(id);
  if (tx) {
    await db.transactions.put({ ...tx, status: 'refunded', ...meta });
  }
  return fetchTransactions();
}

export async function clearAllTransactions(): Promise<Transaction[]> {
  await db.transactions.clear();
  return [];
}

// ---------------------------------------------------------------------------
// Event config (singleton, id=1)
// ---------------------------------------------------------------------------
export async function fetchEventConfig(): Promise<EventConfig> {
  const row = await db.eventConfig.get(1);
  if (row) {
    const { id: _id, ...cfg } = row;
    // Enforce RM/MYR migration on any legacy saved config
    if (cfg.currencySymbol === '$' || cfg.currencyCode === 'USD' || !cfg.currencySymbol || !cfg.currencyCode) {
      const migrated = { ...cfg, currencySymbol: 'RM', currencyCode: 'MYR' };
      await db.eventConfig.put({ ...migrated, id: 1 });
      return migrated;
    }
    return cfg;
  }
  // Fallback: persist the default config
  await db.eventConfig.put({ ...INITIAL_EVENT_CONFIG, id: 1 });
  return INITIAL_EVENT_CONFIG;
}

export async function saveEventConfig(cfg: EventConfig): Promise<EventConfig> {
  await db.eventConfig.put({ ...cfg, id: 1 });
  return cfg;
}

// ---------------------------------------------------------------------------
// Cart (singleton, id=1)
// ---------------------------------------------------------------------------
export async function fetchCart(): Promise<CartItem[]> {
  const row = await db.cart.get(1);
  return row?.items ?? [];
}

export async function saveCartItems(items: CartItem[]): Promise<CartItem[]> {
  await db.cart.put({ id: 1, items });
  return items;
}

export async function clearCartItems(): Promise<CartItem[]> {
  await db.cart.put({ id: 1, items: [] });
  return [];
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------
export async function resetDemoData(): Promise<{
  products: Product[];
  transactions: Transaction[];
  eventConfig: EventConfig;
  cart: CartItem[];
}> {
  await resetDatabase();
  const [products, eventConfig, transactions, cart] = await Promise.all([
    fetchProducts(),
    fetchEventConfig(),
    fetchTransactions(),
    fetchCart(),
  ]);
  return { products, transactions, eventConfig, cart };
}
