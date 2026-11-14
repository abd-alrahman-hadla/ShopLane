import type { PhotoKey } from "./photos";

export type SeedVariant = {
  sku: string;
  title: string;
  size?: string;
  color?: string;
  priceCents: number;
  compareAtPriceCents?: number;
  stock: number;
};

export type SeedImage = {
  photo: PhotoKey;
  /** SKU of the variant this image belongs to (e.g. a colorway). */
  variantSku?: string;
};

export type SeedProduct = {
  slug: string;
  name: string;
  description: string;
  categorySlug: string;
  status?: "ACTIVE" | "DRAFT";
  featured?: boolean;
  variants: SeedVariant[];
  images: SeedImage[];
};

export type SeedCategory = {
  slug: string;
  name: string;
  description: string;
  photo: PhotoKey;
  sortOrder: number;
};
