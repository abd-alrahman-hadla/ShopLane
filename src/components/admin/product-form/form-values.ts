import {
  centsToPriceInput,
  parsePriceToCents,
  type ProductFormInput,
} from "@/features/admin/products/schemas";
import type { EditableProduct } from "@/features/admin/products/editable";

export type { EditableProduct };

/** Form state: prices are strings (what the admin types), rows have stable client keys. */
export type VariantRow = {
  key: string;
  id: string | null;
  sku: string;
  title: string;
  size: string;
  color: string;
  price: string;
  compareAt: string;
  stock: string;
  /** Past orders using this variant (can't be removed when > 0). */
  orderCount: number;
};

export type ImageRow = { key: string; url: string; alt: string; variantSku: string };

export type ProductFormValues = {
  id: string | null;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  status: "DRAFT" | "ACTIVE";
  featured: boolean;
  seoTitle: string;
  seoDescription: string;
  variants: VariantRow[];
  images: ImageRow[];
  /** Arabic content; all empty = no Arabic version. */
  arabic: { name: string; description: string; seoTitle: string; seoDescription: string };
};

const EMPTY_ARABIC = { name: "", description: "", seoTitle: "", seoDescription: "" };

let counter = 0;
export function rowKey(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export function emptyVariant(): VariantRow {
  return {
    key: rowKey("v"),
    id: null,
    sku: "",
    title: "",
    size: "",
    color: "",
    price: "",
    compareAt: "",
    stock: "0",
    orderCount: 0,
  };
}

export function toFormValues(
  product: EditableProduct | null,
  defaultCategoryId: string,
): ProductFormValues {
  if (!product) {
    return {
      id: null,
      name: "",
      slug: "",
      description: "",
      categoryId: defaultCategoryId,
      status: "DRAFT",
      featured: false,
      seoTitle: "",
      seoDescription: "",
      variants: [emptyVariant()],
      images: [],
      arabic: { ...EMPTY_ARABIC },
    };
  }
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    categoryId: product.categoryId,
    status: product.status === "ACTIVE" ? "ACTIVE" : "DRAFT",
    featured: product.featured,
    seoTitle: product.seoTitle ?? "",
    seoDescription: product.seoDescription ?? "",
    variants: product.variants.map((variant) => ({
      key: variant.id,
      id: variant.id,
      sku: variant.sku,
      title: variant.title,
      size: variant.size ?? "",
      color: variant.color ?? "",
      price: centsToPriceInput(variant.priceCents),
      compareAt: centsToPriceInput(variant.compareAtPriceCents),
      stock: String(variant.stock),
      orderCount: variant.orderCount,
    })),
    images: product.images.map((image) => ({
      key: image.id,
      url: image.url,
      alt: image.alt,
      variantSku: image.variantSku ?? "",
    })),
    arabic: product.arabic
      ? {
          name: product.arabic.name,
          description: product.arabic.description,
          seoTitle: product.arabic.seoTitle ?? "",
          seoDescription: product.arabic.seoDescription ?? "",
        }
      : { ...EMPTY_ARABIC },
  };
}

export type PayloadResult =
  { ok: true; payload: ProductFormInput } | { ok: false; fieldErrors: Record<string, string> };

/**
 * Converts form state to the server payload. Only does what the browser must
 * (parse money and integers); every rule is enforced again on the server.
 */
export function toPayload(values: ProductFormValues): PayloadResult {
  const fieldErrors: Record<string, string> = {};
  const variants = values.variants.map((variant, index) => {
    const priceCents = parsePriceToCents(variant.price);
    if (priceCents === null)
      fieldErrors[`variants.${index}.priceCents`] = "Enter a price like 18.50.";
    const compareAt = variant.compareAt.trim() === "" ? null : parsePriceToCents(variant.compareAt);
    if (variant.compareAt.trim() !== "" && compareAt === null) {
      fieldErrors[`variants.${index}.compareAtPriceCents`] =
        "Enter a price like 21.00, or leave empty.";
    }
    const stock = /^\d+$/.test(variant.stock.trim()) ? Number(variant.stock.trim()) : null;
    if (stock === null) fieldErrors[`variants.${index}.stock`] = "Whole number of units.";
    return {
      id: variant.id,
      sku: variant.sku,
      title: variant.title,
      size: variant.size,
      color: variant.color,
      priceCents: priceCents ?? 0,
      compareAtPriceCents: compareAt,
      stock: stock ?? 0,
    };
  });
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  return {
    ok: true,
    payload: {
      id: values.id,
      name: values.name,
      slug: values.slug,
      description: values.description,
      categoryId: values.categoryId,
      status: values.status,
      featured: values.featured,
      seoTitle: values.seoTitle,
      seoDescription: values.seoDescription,
      variants,
      images: values.images.map((image) => ({
        url: image.url,
        alt: image.alt,
        variantSku: image.variantSku,
      })),
      translations: { ar: { ...values.arabic } },
    },
  };
}
