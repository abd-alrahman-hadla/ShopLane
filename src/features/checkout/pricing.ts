/** Order pricing. Everything is integer cents; nothing here trusts client input. */

export const SHIPPING_FLAT_CENTS = 600;
/** Orders at or above this amount (after discount) ship free. */
export const FREE_SHIPPING_THRESHOLD_CENTS = 5000;

export type PricedLine = { unitPriceCents: number; quantity: number };

export type Discount =
  { type: "PERCENTAGE"; value: number } | { type: "FIXED_AMOUNT"; value: number };

export type OrderTotals = {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
};

function assertCents(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative integer, received ${value}`);
  }
}

export function lineTotalCents(line: PricedLine): number {
  assertCents(line.unitPriceCents, "unitPriceCents");
  if (!Number.isInteger(line.quantity) || line.quantity < 1) {
    throw new RangeError(`quantity must be a positive integer, received ${line.quantity}`);
  }
  return line.unitPriceCents * line.quantity;
}

export function subtotalCents(lines: readonly PricedLine[]): number {
  return lines.reduce((sum, line) => sum + lineTotalCents(line), 0);
}

/** Discount in cents, never more than the subtotal. Percentages round half up. */
export function discountCents(subtotal: number, discount: Discount | null): number {
  if (!discount || subtotal === 0) return 0;
  const raw =
    discount.type === "PERCENTAGE"
      ? Math.round((subtotal * Math.min(Math.max(discount.value, 0), 100)) / 100)
      : Math.max(discount.value, 0);
  return Math.min(raw, subtotal);
}

/** Flat-rate shipping, free above the threshold. Empty carts don't ship. */
export function shippingCents(discountedSubtotal: number, itemCount: number): number {
  if (itemCount === 0) return 0;
  return discountedSubtotal >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_FLAT_CENTS;
}

export function computeOrderTotals(
  lines: readonly PricedLine[],
  discount: Discount | null = null,
): OrderTotals {
  const subtotal = subtotalCents(lines);
  const discountAmount = discountCents(subtotal, discount);
  const afterDiscount = subtotal - discountAmount;
  const shipping = shippingCents(afterDiscount, lines.length);
  const tax = 0; // Stripe Tax is not enabled yet.
  return {
    subtotalCents: subtotal,
    discountCents: discountAmount,
    shippingCents: shipping,
    taxCents: tax,
    totalCents: afterDiscount + shipping + tax,
  };
}
