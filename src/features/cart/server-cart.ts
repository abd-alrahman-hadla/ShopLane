import { mergeCarts, type CartItem } from "./cart";
import { loadPurchasableVariants, type DbClient } from "./quote";

export async function readServerCart(db: DbClient, userId: string): Promise<CartItem[]> {
  const cart = await db.cart.findUnique({
    where: { userId },
    select: {
      items: { select: { variantId: true, quantity: true }, orderBy: { createdAt: "asc" } },
    },
  });
  return cart?.items ?? [];
}

export async function replaceServerCart(
  db: DbClient,
  userId: string,
  items: readonly CartItem[],
): Promise<void> {
  // INSERT … ON CONFLICT DO NOTHING, then read: unlike upsert, this can't fail
  // when two requests (e.g. two tabs right after sign-in) create the cart at once.
  await db.cart.createMany({ data: [{ userId }], skipDuplicates: true });
  const cart = await db.cart.findUniqueOrThrow({ where: { userId }, select: { id: true } });
  await db.cartItem.deleteMany({ where: { cartId: cart.id } });
  if (items.length > 0) {
    await db.cartItem.createMany({
      data: items.map((item) => ({
        cartId: cart.id,
        variantId: item.variantId,
        quantity: item.quantity,
      })),
    });
  }
}

/** Merges a guest cart into the user's server cart and persists the result. */
export async function mergeGuestCart(
  db: DbClient,
  userId: string,
  guestItems: readonly CartItem[],
): Promise<CartItem[]> {
  const serverItems = await readServerCart(db, userId);
  const variantIds = [...new Set([...serverItems, ...guestItems].map((item) => item.variantId))];
  const variants = await loadPurchasableVariants(db, variantIds);
  const stock = new Map([...variants].map(([id, variant]) => [id, variant.stock]));
  const merged = mergeCarts(serverItems, guestItems, stock);
  await replaceServerCart(db, userId, merged);
  return merged;
}

/** Keeps only variants that still exist (FK-safe) before saving a client cart. */
export async function saveServerCart(
  db: DbClient,
  userId: string,
  items: readonly CartItem[],
): Promise<void> {
  const variants = await loadPurchasableVariants(
    db,
    items.map((item) => item.variantId),
  );
  await replaceServerCart(
    db,
    userId,
    items.filter((item) => variants.has(item.variantId)),
  );
}
