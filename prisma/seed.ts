import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";
import { syncProductPriceRange } from "../src/features/catalog/pricing";
import { photoUrl, photos, seedCategories, seedCoupons, seedProducts } from "./seed-data";
import type { SeedProduct } from "./seed-data";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

async function seedCategoryRows(db: PrismaClient): Promise<Map<string, string>> {
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
    ids.set(category.slug, row.id);
  }
  return ids;
}

async function seedProduct(
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
  } as const;

  await db.$transaction(async (tx) => {
    const row = await tx.product.upsert({
      where: { slug: product.slug },
      create: { slug: product.slug, ...data },
      update: data,
    });

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
  });
}

async function seedAdmin(db: PrismaClient): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL;
  if (!email) {
    console.warn("SEED_ADMIN_EMAIL not set: skipping admin user.");
    return;
  }
  await db.user.upsert({
    where: { email },
    create: { email, name: "ShopLane Admin", role: "ADMIN" },
    update: { role: "ADMIN" },
  });
}

async function seedCouponRows(db: PrismaClient): Promise<void> {
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

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed with NODE_ENV=production.");
  }

  const db = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: requireEnv("DATABASE_URL") }),
  });
  try {
    const categoryIds = await seedCategoryRows(db);
    for (const product of seedProducts) {
      const categoryId = categoryIds.get(product.categorySlug);
      if (!categoryId) {
        throw new Error(`Unknown category "${product.categorySlug}" for ${product.slug}`);
      }
      await seedProduct(db, product, categoryId);
    }
    await seedAdmin(db);
    await seedCouponRows(db);

    const [categories, products, variants, images] = await Promise.all([
      db.category.count(),
      db.product.count(),
      db.variant.count(),
      db.productImage.count(),
    ]);
    console.log(
      `Seeded ${categories} categories, ${products} products, ${variants} variants, ${images} images.`,
    );
    // The seed runs outside Next, so it can't call revalidateTag().
    console.log(
      "Note: a running `next dev`/`next start` may serve cached catalog data for up to an hour. Restart it to see seeded changes.",
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
