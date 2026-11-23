import { ratingSummary } from "@/features/reviews/rating";
import { localizeContent } from "./localize";
import type { ProductCardData } from "./types";

export type ProductCardRow = {
  id: string;
  slug: string;
  name: string;
  minPriceCents: number;
  maxPriceCents: number;
  ratingSum: number;
  ratingCount: number;
  category: { name: string; translations?: Array<{ name: string }> };
  /** At most one row: the requested locale's translation (none in English). */
  translations?: Array<{ name: string }>;
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
    name: localizeContent({ name: row.name }, row.translations?.[0]).name,
    categoryName: localizeContent({ name: row.category.name }, row.category.translations?.[0]).name,
    image: firstImage ? { url: firstImage.url, alt: firstImage.alt } : null,
    priceFromCents: row.minPriceCents,
    hasPriceRange: row.minPriceCents !== row.maxPriceCents,
    compareAtCents:
      compareAt !== null && cheapest && compareAt > cheapest.priceCents ? compareAt : null,
    inStock: row.variants.some((variant) => variant.stock > 0),
    rating: ratingSummary(row.ratingSum, row.ratingCount),
  };
}
