/**
 * Digital receipt payload + encoding.
 *
 * Architecture: the QR code carries the receipt — a compact DTO is encoded
 * into the URL fragment (#data=...) of the static viewer page hosted on
 * GitHub Pages. No backend, no database, nothing is sent to any server;
 * the fragment never leaves the customer's browser.
 *
 * The viewer is strictly decode → validate → display. It never writes back.
 */
import { Transaction, EventConfig } from '../types';
import { roundMoney, lineTotal } from './money';

export interface DigitalReceiptItem {
  n: string; // item name
  q: number; // quantity
  p: number; // unit price
  s: number; // line subtotal
}

export interface DigitalReceiptPayload {
  v: number; // payload version (1 = current format)
  r: string; // receipt number
  d: string; // ISO timestamp
  e?: string; // event/booth label
  cur?: string; // currency symbol, e.g. 'RM'
  i: DigitalReceiptItem[];
  st: number; // subtotal
  dc?: number; // discount amount
  tx?: number; // tax amount
  t: number; // grand total
  pm?: string; // payment method
}

export const RECEIPT_PAYLOAD_VERSION = 1;

/**
 * Public viewer base URL — the receipt viewer is a separate app deployed to
 * its own GitHub Pages site (chibishoppu-receipt). The customer's phone
 * cannot reach the POS device's own origin (Android WebView = localhost),
 * so the POS always points at the public deployment. Override with
 * VITE_RECEIPT_BASE if the receipt site URL ever changes.
 */
const VIEWER_BASE = import.meta.env.VITE_RECEIPT_BASE || 'https://chibishoppu.github.io/chibishoppu-receipt/';

/** Transaction → compact receipt DTO. Values are copied, never recomputed. */
export function buildReceiptPayload(tx: Transaction, cfg: EventConfig): DigitalReceiptPayload {
  return {
    v: RECEIPT_PAYLOAD_VERSION,
    r: tx.receiptNumber,
    d: tx.timestamp,
    e: tx.eventName ? `${tx.eventName}${tx.boothNumber ? ` • ${tx.boothNumber}` : ''}` : undefined,
    cur: cfg.currencySymbol,
    i: tx.items.map((it) => ({
      n: it.name,
      q: it.quantity,
      p: roundMoney(it.unitPrice),
      s: lineTotal(it.unitPrice, it.quantity),
    })),
    st: roundMoney(tx.subtotal),
    dc: tx.discountAmount > 0 ? roundMoney(tx.discountAmount) : undefined,
    tx: tx.taxAmount > 0 ? roundMoney(tx.taxAmount) : undefined,
    t: roundMoney(tx.total),
    pm: tx.paymentMethod,
  };
}

// --- base64url (URL-fragment-safe) encode/decode, UTF-8 aware ---

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function encodeReceipt(p: DigitalReceiptPayload): string {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(p)));
}

/** Full customer-facing viewer URL for a transaction — the QR content. */
export function buildDigitalReceiptUrl(tx: Transaction, cfg: EventConfig): string {
  const base = VIEWER_BASE.endsWith('/') ? VIEWER_BASE : `${VIEWER_BASE}/`;
  return `${base}#data=${encodeReceipt(buildReceiptPayload(tx, cfg))}`;
}
