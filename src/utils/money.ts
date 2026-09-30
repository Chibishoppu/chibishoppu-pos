/**
 * Money helpers — all arithmetic happens in integer cents so values stay
 * exact (integers below 2^53 never lose floating-point precision).
 * Convert to cents at the boundary, do math on integers, convert back
 * only for storage/display. Stored values remain plain 2-decimal numbers,
 * so Dexie/backup/receipt formats are unchanged.
 */

/** Converts a float amount to integer cents. */
export const toCents = (amount: number): number => Math.round(amount * 100);

/** Converts integer cents back to a float amount (exact 2 decimal places). */
export const fromCents = (cents: number): number => cents / 100;

/** Rounds a float amount to 2 decimal places without float residue. */
export const roundMoney = (amount: number): number => fromCents(toCents(amount));

/** Exact line total for unit price × quantity. */
export const lineTotal = (unitPrice: number, quantity: number): number =>
  fromCents(toCents(unitPrice) * quantity);

/** Exact sum of already-stored 2-decimal amounts. */
export const sumAmounts = (amounts: number[]): number =>
  fromCents(amounts.reduce((sum, a) => sum + toCents(a), 0));
