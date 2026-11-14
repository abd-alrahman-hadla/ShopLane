import type { ProductCardData } from "./types";

export type ProductCardRow = {
  id: string;
  slug: string;
  name: string;
  minPriceCents: number;
  maxPriceCents: number;
  category: { name: string };
  images: Array<{ url: string; alt: string }>;
  variants: Array<{ priceCents: number; compareAtPriceCents: number | null; stock: number }>;
};

/** Maps a product row to the card shape shown in grids. */
export function toProductCard(row: ProductCardRow): ProductCardData {
  const cheapest = row.variants.reduce<ProductCardRow["variants"][number] | undefined>(
    (best, variant) =>
      best === undefined || variant.priceCents < best.priceCents ? variant : best,
    undefined,
  );
  const compareAt = cheapest?.compareAtPriceCents ?? null;
  const firstImage = row.images[0];

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    categoryName: row.category.name,
    image: firstImage ? { url: firstImage.url, alt: firstImage.alt } : null,
    priceFromCents: row.minPriceCents,
    hasPriceRange: row.minPriceCents !== row.maxPriceCents,
    compareAtCents:
      compareAt !== null && cheapest && compareAt > cheapest.priceCents ? compareAt : null,
    inStock: row.variants.some((variant) => variant.stock > 0),
  };
}
