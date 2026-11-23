/**
 * Idempotent catalog seeding, shared by `prisma/seed.ts`, the nightly demo
 * reset and the admin's "Reset demo data" button. No side effects on import.
 */
import type { PrismaClient } from "../src/generated/prisma/client";
import { syncProductPriceRange } from "../src/features/catalog/pricing";
import {
  arCategories,
  arProducts,
  photoUrl,
  photos,
  seedCategories,
  seedCoupons,
  seedProducts,
} from "./seed-data";
import type { SeedProduct } from "./seed-data";

/** Each seed transaction makes many sequential queries; allow for a distant database. */
export const SEED_TRANSACTION_OPTIONS = { timeout: 60_000, maxWait: 15_000 } as const;

export async function seedCategoryRows(db: PrismaClient): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const category of seedCategories) {
    const data = {
      name: category.name,
      description: category.description,
      imageUrl: photoUrl(category.photo),
      sortOrder: category.sortOrder,
    };
    const row = await db.category.upsert({
      where: { slug: category.slug },
      create: { slug: category.slug, ...data },
      update: data,
    });
    const arabic = arCategories[category.slug];
    if (arabic) {
      await db.categoryTranslation.upsert({
        where: { categoryId_locale: { categoryId: row.id, locale: "ar" } },
        create: { categoryId: row.id, locale: "ar", ...arabic },
        update: arabic,
      });
    }
    ids.set(category.slug, row.id);
  }
  return ids;
}

export async function seedProduct(
  db: PrismaClient,
  product: SeedProduct,
  categoryId: string,
): Promise<void> {
  const data = {
    name: product.name,
    description: product.description,
    status: product.status ?? "ACTIVE",
    featured: product.featured ?? false,
    categoryId,
    // Seeded products have no SEO overrides; clearing them undoes admin edits on re-seed.
    seoTitle: null,
    seoDescription: null,
  } as const;

  await db.$transaction(async (tx) => {
    const row = await tx.product.upsert({
      where: { slug: product.slug },
      create: { slug: product.slug, ...data },
      update: data,
    });

    // Arabic content (seeded products have no SEO overrides in either language).
    const arabic = arProducts[product.slug];
    if (arabic) {
      const translation = { ...arabic, seoTitle: null, seoDescription: null };
      await tx.productTranslation.upsert({
        where: { productId_locale: { productId: row.id, locale: "ar" } },
        create: { productId: row.id, locale: "ar", ...translation },
        update: translation,
      });
    }

    const variantIds = new Map<string, string>();
    for (const [position, variant] of product.variants.entries()) {
      const variantData = {
        productId: row.id,
        title: variant.title,
        size: variant.size ?? null,
        color: variant.color ?? null,
        priceCents: variant.priceCents,
        compareAtPriceCents: variant.compareAtPriceCents ?? null,
        stock: variant.stock,
        position,
      };
      const saved = await tx.variant.upsert({
        where: { sku: variant.sku },
        create: { sku: variant.sku, ...variantData },
        update: variantData,
      });
      variantIds.set(variant.sku, saved.id);
    }

    // Variants added later (e.g. in the admin) go away again, unless they were
    // ordered: those keep their order history and are just taken out of stock.
    const extraVariants = await tx.variant.findMany({
      where: { productId: row.id, sku: { notIn: product.variants.map((variant) => variant.sku) } },
      select: { id: true, _count: { select: { orderItems: true } } },
    });
    const ordered = extraVariants.filter((variant) => variant._count.orderItems > 0);
    const unordered = extraVariants.filter((variant) => variant._count.orderItems === 0);
    if (unordered.length > 0) {
      await tx.variant.deleteMany({
        where: { id: { in: unordered.map((variant) => variant.id) } },
      });
    }
    if (ordered.length > 0) {
      await tx.variant.updateMany({
        where: { id: { in: ordered.map((variant) => variant.id) } },
        data: { stock: 0 },
      });
    }

    // Images have no natural key, so replace them wholesale.
    await tx.productImage.deleteMany({ where: { productId: row.id } });
    await tx.productImage.createMany({
      data: product.images.map((image, position) => ({
        productId: row.id,
        variantId: image.variantSku ? (variantIds.get(image.variantSku) ?? null) : null,
        url: photoUrl(image.photo),
        alt: photos[image.photo].alt,
        position,
      })),
    });

    await syncProductPriceRange(tx, row.id);
  }, SEED_TRANSACTION_OPTIONS);
}

export async function seedCouponRows(db: PrismaClient): Promise<void> {
  for (const coupon of seedCoupons) {
    const data = {
      type: coupon.type,
      value: coupon.value,
      minSubtotalCents: coupon.minSubtotalCents ?? null,
      isActive: true,
    };
    await db.coupon.upsert({
      where: { code: coupon.code },
      create: { code: coupon.code, ...data },
      update: data,
    });
  }
}

/** Upserts every seeded category and product (variants, stock, prices, images). Returns the product slugs. */
export async function seedCatalog(db: PrismaClient): Promise<string[]> {
  const categoryIds = await seedCategoryRows(db);
  for (const product of seedProducts) {
    const categoryId = categoryIds.get(product.categorySlug);
    if (!categoryId) {
      throw new Error(`Unknown category "${product.categorySlug}" for ${product.slug}`);
    }
    await seedProduct(db, product, categoryId);
  }
  return seedProducts.map((product) => product.slug);
}

/** Creates (or re-promotes) the admin user for an email. */
export async function seedAdminUser(db: PrismaClient, email: string): Promise<void> {
  await db.user.upsert({
    where: { email },
    create: { email, name: "ShopLane Admin", role: "ADMIN" },
    update: { role: "ADMIN" },
  });
}
