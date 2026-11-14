/** Plain, serializable shapes returned by catalog queries (safe for the data cache). */

export type CatalogImage = { url: string; alt: string };

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  categoryName: string;
  image: CatalogImage | null;
  priceFromCents: number;
  hasPriceRange: boolean;
  /** "Was" price for the cheapest variant, when it is on sale. */
  compareAtCents: number | null;
  inStock: boolean;
};

export type CategorySummary = {
  id: string;
  slug: string;
  name: string;
  description: string;
  imageUrl: string | null;
  productCount: number;
};

export type VariantOption = {
  id: string;
  sku: string;
  title: string;
  size: string | null;
  color: string | null;
  priceCents: number;
  compareAtPriceCents: number | null;
  stock: number;
};

export type ProductImageData = CatalogImage & { id: string; variantId: string | null };

export type ProductDetail = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: { slug: string; name: string };
  variants: VariantOption[];
  images: ProductImageData[];
};

export type ProductListResult = {
  items: ProductCardData[];
  total: number;
  page: number;
  pageCount: number;
};

export type CatalogFacets = {
  sizes: string[];
  colors: string[];
  /** Whole currency units, for the price inputs' placeholders. */
  priceMin: number | null;
  priceMax: number | null;
};
