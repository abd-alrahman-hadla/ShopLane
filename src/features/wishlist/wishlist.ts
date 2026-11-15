import type { DbClient } from "@/features/cart/quote";
import { toProductCard } from "@/features/catalog/mappers";
import { productCardSelect } from "@/features/catalog/queries";
import type { ProductCardData } from "@/features/catalog/types";

export const MAX_WISHLIST_ITEMS = 200;

export type SetWishlistResult =
  { ok: true; wishlisted: boolean } | { ok: false; error: "product_not_found" | "wishlist_full" };

/**
 * Sets (rather than toggles) the wishlist state, so repeated or out-of-order
 * requests from an optimistic UI always converge on what the user last chose.
 */
export async function setWishlisted(
  db: DbClient,
  userId: string,
  productId: string,
  wishlisted: boolean,
): Promise<SetWishlistResult> {
  if (!wishlisted) {
    await db.wishlistItem.deleteMany({ where: { userId, productId } });
    return { ok: true, wishlisted: false };
  }
  const product = await db.product.findFirst({
    where: { id: productId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!product) return { ok: false, error: "product_not_found" };
  if ((await db.wishlistItem.count({ where: { userId } })) >= MAX_WISHLIST_ITEMS) {
    const already = await db.wishlistItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (!already) return { ok: false, error: "wishlist_full" };
  }
  await db.wishlistItem.createMany({ data: [{ userId, productId }], skipDuplicates: true });
  return { ok: true, wishlisted: true };
}

/** IDs of wishlisted products that are still on sale. */
export async function getWishlistProductIds(db: DbClient, userId: string): Promise<string[]> {
  const items = await db.wishlistItem.findMany({
    where: { userId, product: { status: "ACTIVE" } },
    select: { productId: true },
  });
  return items.map((item) => item.productId);
}

/** Wishlisted products as cards, most recently saved first. Drafts and archived products are hidden. */
export async function getWishlistProducts(
  db: DbClient,
  userId: string,
): Promise<ProductCardData[]> {
  const items = await db.wishlistItem.findMany({
    where: { userId, product: { status: "ACTIVE" } },
    orderBy: { createdAt: "desc" },
    select: { product: { select: productCardSelect } },
  });
  return items.map((item) => toProductCard(item.product));
}
