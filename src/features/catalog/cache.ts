import { revalidateTag } from "next/cache";

/** Cache tags for catalog data. Pages that read tagged data are purged with it. */
export const CATALOG_TAGS = {
  products: "products",
  categories: "categories",
  product: (slug: string) => `product:${slug}`,
} as const;

export type RevalidateCatalogInput = {
  /** Slugs of products that changed. Include the old slug when a slug is renamed. */
  productSlugs?: readonly string[];
  /** True when category data (names, images, order) changed. */
  categories?: boolean;
};

/**
 * The single entry point for "revalidate on admin edits". Admin Server Actions
 * call this after any catalog write. Lists, home, facets and product counts all
 * depend on products, so that tag is always purged.
 */
export function revalidateCatalog(input: RevalidateCatalogInput = {}): string[] {
  const tags = new Set<string>([CATALOG_TAGS.products]);
  for (const slug of input.productSlugs ?? []) tags.add(CATALOG_TAGS.product(slug));
  if (input.categories) tags.add(CATALOG_TAGS.categories);
  for (const tag of tags) revalidateTag(tag);
  return [...tags];
}
