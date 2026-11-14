import type { Prisma } from "@/generated/prisma/client";

export type PriceRange = { minPriceCents: number; maxPriceCents: number };

/** Min/max price across a product's variants. Empty input gives a 0–0 range. */
export function computePriceRange(variants: ReadonlyArray<{ priceCents: number }>): PriceRange {
  if (variants.length === 0) {
    return { minPriceCents: 0, maxPriceCents: 0 };
  }
  const prices = variants.map((variant) => variant.priceCents);
  return { minPriceCents: Math.min(...prices), maxPriceCents: Math.max(...prices) };
}

type PricingDb = Pick<Prisma.TransactionClient, "variant" | "product">;

/**
 * Recomputes the denormalized price range on Product from its variants.
 * Call after creating, updating or deleting variants.
 */
export async function syncProductPriceRange(db: PricingDb, productId: string): Promise<PriceRange> {
  const variants = await db.variant.findMany({
    where: { productId },
    select: { priceCents: true },
  });
  const range = computePriceRange(variants);
  await db.product.update({ where: { id: productId }, data: range });
  return range;
}
