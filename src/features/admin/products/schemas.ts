import { z } from "zod";

export const SEO_TITLE_MAX = 70;
export const SEO_DESCRIPTION_MAX = 160;
export const MAX_VARIANTS = 50;
export const MAX_IMAGES = 20;

/** Hosts product images may come from (must match next.config.ts remotePatterns). */
export function isAllowedImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    return (
      url.hostname === "images.unsplash.com" ||
      url.hostname === "utfs.io" ||
      url.hostname.endsWith(".ufs.sh")
    );
  } catch {
    return false;
  }
}

/** "12.5" → 1250. Returns null for anything that isn't a non-negative amount with ≤ 2 decimals. */
export function parsePriceToCents(value: string): number | null {
  const trimmed = value.trim().replace(/^\$/, "").replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const [whole = "0", fraction = ""] = trimmed.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

/** 1250 → "12.50" (for form inputs). */
export function centsToPriceInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toFixed(2);
}

/** "Ethiopia Yirgacheffe – 250 g!" → "ethiopia-yirgacheffe-250-g". */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value ? value : null));

const cents = z.number().int().min(0).max(10_000_000);

export const variantInputSchema = z
  .object({
    id: z.string().min(1).max(40).nullish(),
    sku: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9][A-Z0-9-]{2,39}$/, "SKU: 3–40 letters, digits or dashes."),
    title: z.string().trim().min(1, "Variant title is required.").max(60),
    size: optionalText(30),
    color: optionalText(30),
    priceCents: cents.min(1, "Price must be above $0."),
    compareAtPriceCents: cents.nullish().transform((value) => value ?? null),
    stock: z.number().int().min(0).max(100_000),
  })
  .strict()
  .refine((v) => v.compareAtPriceCents === null || v.compareAtPriceCents > v.priceCents, {
    message: "Compare-at price must be higher than the price.",
    path: ["compareAtPriceCents"],
  });

export const imageInputSchema = z
  .object({
    url: z
      .string()
      .trim()
      .refine(isAllowedImageUrl, "Use an uploaded image or an images.unsplash.com https URL."),
    alt: z.string().trim().min(1, "Alt text is required.").max(160),
    /** SKU of the variant this image shows (SKUs are stable before variants have IDs). */
    variantSku: optionalText(40),
  })
  .strict();

/** Arabic name/description/SEO. All empty = no Arabic version (the store falls back to English). */
export const arabicContentSchema = z
  .object({
    name: optionalText(120),
    description: optionalText(5000),
    seoTitle: optionalText(SEO_TITLE_MAX),
    seoDescription: optionalText(SEO_DESCRIPTION_MAX),
  })
  .strict();

export type ArabicContent = z.output<typeof arabicContentSchema>;

export const productFormSchema = z
  .object({
    id: z.string().min(1).max(40).nullish(),
    name: z.string().trim().min(2, "Name is required.").max(120),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, digits and single dashes.")
      .max(80),
    description: z.string().trim().min(10, "Write at least a sentence.").max(5000),
    categoryId: z.string().min(1, "Choose a category.").max(40),
    status: z.enum(["DRAFT", "ACTIVE"]),
    featured: z.boolean(),
    seoTitle: optionalText(SEO_TITLE_MAX),
    seoDescription: optionalText(SEO_DESCRIPTION_MAX),
    variants: z.array(variantInputSchema).min(1, "Add at least one variant.").max(MAX_VARIANTS),
    images: z.array(imageInputSchema).max(MAX_IMAGES),
    /** Optional: omitted = leave the stored translations as they are. */
    translations: z.object({ ar: arabicContentSchema }).strict().optional(),
  })
  .strict()
  .superRefine((product, ctx) => {
    const ar = product.translations?.ar;
    if (ar && !ar.name && (ar.description || ar.seoTitle || ar.seoDescription)) {
      ctx.addIssue({
        code: "custom",
        message: "Add an Arabic name, or clear the other Arabic fields.",
        path: ["translations", "ar", "name"],
      });
    }
    const seen = new Map<string, number>();
    product.variants.forEach((variant, index) => {
      const first = seen.get(variant.sku);
      if (first !== undefined) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate SKU (also row ${first + 1}).`,
          path: ["variants", index, "sku"],
        });
      } else {
        seen.set(variant.sku, index);
      }
    });
    product.images.forEach((image, index) => {
      if (image.variantSku && !seen.has(image.variantSku.toUpperCase())) {
        ctx.addIssue({
          code: "custom",
          message: "Linked variant doesn't exist.",
          path: ["images", index, "variantSku"],
        });
      }
    });
  });

export type ProductFormInput = z.input<typeof productFormSchema>;
export type ProductFormData = z.output<typeof productFormSchema>;

export const productIdSchema = z.object({ productId: z.string().min(1).max(40) }).strict();
