"use server";

import { revalidateCatalog } from "@/features/catalog/cache";
import { AdminActionError, adminMutation } from "../mutation";
import { loadEditableProduct } from "./editable";
import { saveProductTx } from "./save";
import { productFormSchema, productIdSchema } from "./schemas";

/** Create or update a product, its variants and images (one transaction, one audit row). */
export const saveProduct = adminMutation(productFormSchema, async ({ tx, input, t }) => {
  const { result, audit } = await saveProductTx(tx, input, t);
  // Return the saved state (new variant IDs included) so the form can reset in place.
  const product = await loadEditableProduct(tx, result.id);
  if (!product) throw new AdminActionError(t("productReload"));
  return {
    result: { ...result, product },
    audit,
    afterCommit: () =>
      void revalidateCatalog({
        productSlugs: result.previousSlug ? [result.slug, result.previousSlug] : [result.slug],
        categories: true,
      }),
  };
});

/** Archive instead of delete: hidden from the store, kept for order history. */
export const archiveProduct = adminMutation(productIdSchema, async ({ tx, input, t }) => {
  const product = await tx.product.findUnique({ where: { id: input.productId } });
  if (!product) throw new AdminActionError(t("productNotFound"));
  if (product.status === "ARCHIVED") throw new AdminActionError(t("alreadyArchived"));
  await tx.product.update({
    where: { id: product.id },
    data: { status: "ARCHIVED", featured: false },
  });
  return {
    result: { status: "ARCHIVED" as const },
    audit: {
      action: "product.archive",
      entityType: "Product",
      entityId: product.id,
      summary: `Archived ${product.name}`,
      changes: {
        status: [product.status, "ARCHIVED"],
        ...(product.featured ? { featured: [true, false] } : {}),
      },
    },
    afterCommit: () => void revalidateCatalog({ productSlugs: [product.slug], categories: true }),
  };
});

/** Restores an archived product as a draft, so it can be reviewed before going live. */
export const restoreProduct = adminMutation(productIdSchema, async ({ tx, input, t }) => {
  const product = await tx.product.findUnique({ where: { id: input.productId } });
  if (!product) throw new AdminActionError(t("productNotFound"));
  if (product.status !== "ARCHIVED") throw new AdminActionError(t("onlyArchived"));
  await tx.product.update({ where: { id: product.id }, data: { status: "DRAFT" } });
  return {
    result: { status: "DRAFT" as const },
    audit: {
      action: "product.restore",
      entityType: "Product",
      entityId: product.id,
      summary: `Restored ${product.name} as a draft`,
      changes: { status: ["ARCHIVED", "DRAFT"] },
    },
    afterCommit: () => void revalidateCatalog({ productSlugs: [product.slug], categories: true }),
  };
});
