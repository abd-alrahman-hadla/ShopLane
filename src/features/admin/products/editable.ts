import type { DbClient } from "@/features/cart/quote";
import { getAdminProduct } from "./queries";

/** What the product edit form needs, as plain serializable data. */
export type EditableProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  featured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  variants: Array<{
    id: string;
    sku: string;
    title: string;
    size: string | null;
    color: string | null;
    priceCents: number;
    compareAtPriceCents: number | null;
    stock: number;
    /** Past orders using this variant (it can't be removed when > 0). */
    orderCount: number;
  }>;
  images: Array<{ id: string; url: string; alt: string; variantSku: string | null }>;
};

type AdminProduct = NonNullable<Awaited<ReturnType<typeof getAdminProduct>>>;

export function toEditableProduct(product: AdminProduct): EditableProduct {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    categoryId: product.categoryId,
    status: product.status,
    featured: product.featured,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      title: variant.title,
      size: variant.size,
      color: variant.color,
      priceCents: variant.priceCents,
      compareAtPriceCents: variant.compareAtPriceCents,
      stock: variant.stock,
      orderCount: variant._count.orderItems,
    })),
    images: product.images.map((image) => ({
      id: image.id,
      url: image.url,
      alt: image.alt,
      variantSku: image.variant?.sku ?? null,
    })),
  };
}

export async function loadEditableProduct(
  db: DbClient,
  id: string,
): Promise<EditableProduct | null> {
  const product = await getAdminProduct(db, id);
  return product ? toEditableProduct(product) : null;
}
