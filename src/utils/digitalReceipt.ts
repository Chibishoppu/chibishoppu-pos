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
const VIEWER_BASE = import.meta.env.VITE_RECEIPT_BASE || 'https://mia9.github.io/chibishoppu-receipt/';

const r2 = (n: number) => Math.round(n * 100) / 100;

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
      p: r2(it.unitPrice),
      s: r2(it.unitPrice * it.quantity),
    })),
    st: r2(tx.subtotal),
    dc: tx.discountAmount > 0 ? r2(tx.discountAmount) : undefined,
    tx: tx.taxAmount > 0 ? r2(tx.taxAmount) : undefined,
    t: r2(tx.total),
    pm: tx.paymentMethod,
  };
}

// --- base64url (URL-fragment-safe) encode/decode, UTF-8 aware ---

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function encodeReceipt(p: DigitalReceiptPayload): string {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(p)));
}

export type ReceiptDecodeResult =
  | { ok: true; receipt: DigitalReceiptPayload }
  | { ok: false; reason: 'missing' | 'invalid' | 'version' };

export function decodeReceipt(encoded: string): ReceiptDecodeResult {
  if (!encoded) return { ok: false, reason: 'missing' };
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(encoded));
    const data = JSON.parse(json) as DigitalReceiptPayload;
    if (data?.v !== RECEIPT_PAYLOAD_VERSION) return { ok: false, reason: 'version' };
    if (!data.r || !data.d || !Array.isArray(data.i) || typeof data.t !== 'number') {
      return { ok: false, reason: 'invalid' };
    }
    return { ok: true, receipt: data };
  } catch {
    return { ok: false, reason: 'invalid' };
  }
}

/** Parse #data=... from the URL fragment. */
export function readReceiptFromHash(hash: string = window.location.hash): ReceiptDecodeResult {
  const m = /#data=([^&]+)/.exec(hash);
  return decodeReceipt(m?.[1] ?? '');
}

/** Full customer-facing viewer URL for a transaction — the QR content. */
export function buildDigitalReceiptUrl(tx: Transaction, cfg: EventConfig): string {
  const base = VIEWER_BASE.endsWith('/') ? VIEWER_BASE : `${VIEWER_BASE}/`;
  return `${base}#data=${encodeReceipt(buildReceiptPayload(tx, cfg))}`;
}
