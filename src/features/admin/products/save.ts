import type { DbClient } from "@/features/cart/quote";
import { syncProductPriceRange } from "@/features/catalog/pricing";
import { diffFields, type AuditEntry, type FieldChanges } from "../audit";
import { AdminActionError, type AdminTranslate } from "../mutation";
import type { ArabicContent, ProductFormData } from "./schemas";

const AUDITED_FIELDS = [
  "name",
  "slug",
  "description",
  "categoryId",
  "status",
  "featured",
  "seoTitle",
  "seoDescription",
] as const;

export type SaveProductResult = { id: string; slug: string; previousSlug: string | null };

const ARABIC_AUDIT_KEYS = {
  name: "arName",
  description: "arDescription",
  seoTitle: "arSeoTitle",
  seoDescription: "arSeoDescription",
} as const;

/**
 * Writes (or removes, when every field is empty) the product's Arabic version in
 * the same transaction. Returns audit changes keyed arName, arDescription, ...
 */
async function saveArabicTx(
  tx: DbClient,
  productId: string,
  input: ArabicContent,
): Promise<FieldChanges> {
  const where = { productId_locale: { productId, locale: "ar" } };
  const before = await tx.productTranslation.findUnique({ where });
  const empty = !input.name && !input.description && !input.seoTitle && !input.seoDescription;
  const after = empty
    ? null
    : {
        name: input.name ?? "",
        description: input.description ?? "",
        seoTitle: input.seoTitle,
        seoDescription: input.seoDescription,
      };
  if (after) {
    await tx.productTranslation.upsert({
      where,
      create: { productId, locale: "ar", ...after },
      update: after,
    });
  } else if (before) {
    await tx.productTranslation.delete({ where });
  }
  const changes: FieldChanges = {};
  for (const [field, key] of Object.entries(ARABIC_AUDIT_KEYS)) {
    const previous = before ? before[field as keyof typeof ARABIC_AUDIT_KEYS] : null;
    const next = after ? after[field as keyof typeof ARABIC_AUDIT_KEYS] : null;
    if ((previous || null) !== (next || null)) changes[key] = [previous || null, next || null];
  }
  return changes;
}

/**
 * Creates or updates a product with its variants and images in one transaction.
 * Variants that appear in past orders can't be removed (set their stock to 0):
 * order history and verified-buyer reviews depend on them.
 */
export async function saveProductTx(
  tx: DbClient,
  input: ProductFormData,
  t: AdminTranslate,
): Promise<{ result: SaveProductResult; audit: AuditEntry }> {
  const existing = input.id
    ? await tx.product.findUnique({
        where: { id: input.id },
        include: {
          variants: { include: { _count: { select: { orderItems: true } } } },
          images: { orderBy: { position: "asc" } },
        },
      })
    : null;
  if (input.id && !existing) throw new AdminActionError(t("productGone"));
  if (existing?.status === "ARCHIVED") throw new AdminActionError(t("restoreFirst"));

  const slugTaken = await tx.product.findFirst({
    where: { slug: input.slug, ...(existing ? { NOT: { id: existing.id } } : {}) },
    select: { id: true },
  });
  if (slugTaken) throw new AdminActionError(t("slugTaken"), { slug: t("slugTakenField") });

  const skus = input.variants.map((variant) => variant.sku);
  const skuTaken = await tx.variant.findMany({
    where: { sku: { in: skus }, ...(existing ? { NOT: { productId: existing.id } } : {}) },
    select: { sku: true },
  });
  if (skuTaken.length > 0) {
    const fieldErrors: Record<string, string> = {};
    for (const { sku } of skuTaken)
      fieldErrors[`variants.${skus.indexOf(sku)}.sku`] = t("skuTakenField");
    throw new AdminActionError(
      t("skuTaken", { skus: skuTaken.map((v) => v.sku).join(", ") }),
      fieldErrors,
    );
  }

  const data = {
    name: input.name,
    slug: input.slug,
    description: input.description,
    categoryId: input.categoryId,
    status: input.status,
    featured: input.featured,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
  };
  const product = existing
    ? await tx.product.update({ where: { id: existing.id }, data })
    : await tx.product.create({ data });
  const arabicChanges = input.translations
    ? await saveArabicTx(tx, product.id, input.translations.ar)
    : {};

  // Variants: update kept ones, create new ones, delete removed ones (if unused).
  const existingVariants = new Map(
    (existing?.variants ?? []).map((variant) => [variant.id, variant]),
  );
  const keptIds = new Set(input.variants.flatMap((variant) => (variant.id ? [variant.id] : [])));
  for (const id of keptIds) {
    if (!existingVariants.has(id)) throw new AdminActionError(t("variantForeign"));
  }
  const removed = [...existingVariants.values()].filter((variant) => !keptIds.has(variant.id));
  const blocked = removed.filter((variant) => variant._count.orderItems > 0);
  if (blocked.length > 0) {
    throw new AdminActionError(
      t("variantsOrdered", { skus: blocked.map((v) => v.sku).join(", ") }),
    );
  }
  // Free removed SKUs first so a new variant may reuse one.
  if (removed.length > 0)
    await tx.variant.deleteMany({ where: { id: { in: removed.map((v) => v.id) } } });

  const variantIdBySku = new Map<string, string>();
  for (const [position, variant] of input.variants.entries()) {
    const values = {
      sku: variant.sku,
      title: variant.title,
      size: variant.size,
      color: variant.color,
      priceCents: variant.priceCents,
      compareAtPriceCents: variant.compareAtPriceCents,
      stock: variant.stock,
      position,
    };
    const saved = variant.id
      ? await tx.variant.update({ where: { id: variant.id }, data: values })
      : await tx.variant.create({ data: { ...values, productId: product.id } });
    variantIdBySku.set(saved.sku, saved.id);
  }

  // Images: replaced wholesale in the submitted order.
  await tx.productImage.deleteMany({ where: { productId: product.id } });
  if (input.images.length > 0) {
    await tx.productImage.createMany({
      data: input.images.map((image, position) => ({
        productId: product.id,
        url: image.url,
        alt: image.alt,
        variantId: image.variantSku
          ? (variantIdBySku.get(image.variantSku.toUpperCase()) ?? null)
          : null,
        position,
      })),
    });
  }

  await syncProductPriceRange(tx, product.id);

  const beforeSkus = (existing?.variants ?? []).map((variant) => variant.sku).sort();
  const afterSkus = [...skus].sort();
  const beforeImages = (existing?.images ?? []).map((image) => image.url);
  const afterImages = input.images.map((image) => image.url);
  const changes = {
    ...diffFields(existing, data, AUDITED_FIELDS),
    ...diffFields(
      { variants: beforeSkus, images: beforeImages },
      { variants: afterSkus, images: afterImages },
      ["variants", "images"],
    ),
    ...arabicChanges,
  };
  const variantEdits = input.variants.filter((variant) => {
    if (!variant.id) return false;
    const before = existingVariants.get(variant.id);
    return (
      before &&
      (before.priceCents !== variant.priceCents ||
        before.stock !== variant.stock ||
        before.compareAtPriceCents !== variant.compareAtPriceCents ||
        before.title !== variant.title)
    );
  });
  if (variantEdits.length > 0) changes.variantDetails = [null, variantEdits.map((v) => v.sku)];

  return {
    result: {
      id: product.id,
      slug: product.slug,
      previousSlug: existing && existing.slug !== product.slug ? existing.slug : null,
    },
    audit: {
      action: existing ? "product.update" : "product.create",
      entityType: "Product",
      entityId: product.id,
      summary: existing ? `Updated ${product.name}` : `Created ${product.name}`,
      changes,
    },
  };
}
