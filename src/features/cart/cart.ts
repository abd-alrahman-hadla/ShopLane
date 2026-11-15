/** Pure cart operations. The cart holds only variant IDs and quantities, never prices. */

export const MAX_QUANTITY_PER_LINE = 10;
export const MAX_CART_LINES = 50;

export type CartItem = { variantId: string; quantity: number };

export function clampQuantity(quantity: number, max: number = MAX_QUANTITY_PER_LINE): number {
  if (!Number.isFinite(quantity)) return 0;
  return Math.min(Math.max(Math.floor(quantity), 0), Math.min(max, MAX_QUANTITY_PER_LINE));
}

/** Adds to an existing line or appends a new one, respecting per-line and line-count limits. */
export function addItem(
  items: readonly CartItem[],
  variantId: string,
  quantity: number = 1,
  maxQuantity: number = MAX_QUANTITY_PER_LINE,
): CartItem[] {
  const existing = items.find((item) => item.variantId === variantId);
  if (existing) {
    return items.map((item) =>
      item.variantId === variantId
        ? { ...item, quantity: clampQuantity(item.quantity + quantity, maxQuantity) }
        : item,
    );
  }
  const clamped = clampQuantity(quantity, maxQuantity);
  if (clamped === 0 || items.length >= MAX_CART_LINES) return [...items];
  return [...items, { variantId, quantity: clamped }];
}

/** Sets a line's quantity; zero or less removes it. */
export function setQuantity(
  items: readonly CartItem[],
  variantId: string,
  quantity: number,
  maxQuantity: number = MAX_QUANTITY_PER_LINE,
): CartItem[] {
  const clamped = clampQuantity(quantity, maxQuantity);
  if (clamped === 0) return removeItem(items, variantId);
  return items.map((item) =>
    item.variantId === variantId ? { ...item, quantity: clamped } : item,
  );
}

export function removeItem(items: readonly CartItem[], variantId: string): CartItem[] {
  return items.filter((item) => item.variantId !== variantId);
}

export function itemCount(items: readonly CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

/** Combines duplicate lines (e.g. from a hand-crafted request) by summing quantities. */
export function dedupeItems(items: readonly CartItem[]): CartItem[] {
  const merged = new Map<string, number>();
  for (const item of items) {
    merged.set(item.variantId, (merged.get(item.variantId) ?? 0) + item.quantity);
  }
  return [...merged].map(([variantId, quantity]) => ({ variantId, quantity }));
}

/**
 * Merges a guest cart into a signed-in user's server cart. Quantities for the
 * same variant are summed, then clamped to available stock and the per-line
 * limit. Variants missing from `stockByVariant` (deleted or inactive) or out of
 * stock are dropped. Server lines keep their order; new guest lines follow.
 */
export function mergeCarts(
  serverItems: readonly CartItem[],
  guestItems: readonly CartItem[],
  stockByVariant: ReadonlyMap<string, number>,
): CartItem[] {
  const merged = dedupeItems([...serverItems, ...guestItems]);
  return merged
    .flatMap((item) => {
      const stock = stockByVariant.get(item.variantId);
      if (stock === undefined) return [];
      const quantity = clampQuantity(item.quantity, stock);
      return quantity > 0 ? [{ variantId: item.variantId, quantity }] : [];
    })
    .slice(0, MAX_CART_LINES);
}
