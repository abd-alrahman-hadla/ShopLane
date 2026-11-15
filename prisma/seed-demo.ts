/**
 * Demo customers, their PAID orders and their reviews (dev/seed only).
 * Idempotent: orders are keyed by a fixed `stripeCheckoutSessionId`, reviews by
 * (product, user), so running the seed again updates instead of duplicating.
 */
import type { PrismaClient } from "../src/generated/prisma/client";
import { computeOrderTotals } from "../src/features/checkout/pricing";
import { syncProductRating } from "../src/features/reviews/reviews";
import { DEMO_ORDER_DAYS_AGO, seedCustomers, seedReviews } from "./seed-data/reviews";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Many sequential queries per transaction; allow for a distant database. */
const SEED_TRANSACTION_OPTIONS = { timeout: 60_000, maxWait: 15_000 } as const;

function daysAgo(days: number, now: Date): Date {
  return new Date(now.getTime() - days * DAY_MS);
}

type FirstVariant = {
  id: string;
  sku: string;
  title: string;
  priceCents: number;
  productId: string;
  productName: string;
  imageUrl: string | null;
};

async function loadFirstVariants(
  db: PrismaClient,
  slugs: string[],
): Promise<Map<string, FirstVariant>> {
  const products = await db.product.findMany({
    where: { slug: { in: slugs }, status: "ACTIVE" },
    select: {
      id: true,
      slug: true,
      name: true,
      images: { select: { url: true }, orderBy: { position: "asc" }, take: 1 },
      variants: {
        select: { id: true, sku: true, title: true, priceCents: true },
        orderBy: { position: "asc" },
        take: 1,
      },
    },
  });
  const result = new Map<string, FirstVariant>();
  for (const product of products) {
    const variant = product.variants[0];
    if (!variant) continue;
    result.set(product.slug, {
      ...variant,
      productId: product.id,
      productName: product.name,
      imageUrl: product.images[0]?.url ?? null,
    });
  }
  return result;
}

async function upsertDemoOrder(
  db: PrismaClient,
  userId: string,
  email: string,
  sessionId: string,
  variants: FirstVariant[],
  placedAt: Date,
): Promise<void> {
  const totals = computeOrderTotals(
    variants.map((v) => ({ unitPriceCents: v.priceCents, quantity: 1 })),
  );
  const items = variants.map((v) => ({
    variantId: v.id,
    productName: v.productName,
    variantTitle: v.title,
    sku: v.sku,
    imageUrl: v.imageUrl,
    unitPriceCents: v.priceCents,
    quantity: 1,
    lineTotalCents: v.priceCents,
  }));

  await db.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({
      where: { stripeCheckoutSessionId: sessionId },
      select: { id: true },
    });
    if (existing) {
      await tx.orderItem.deleteMany({ where: { orderId: existing.id } });
      await tx.order.update({
        where: { id: existing.id },
        data: { ...totals, userId, email, items: { create: items } },
      });
      return;
    }
    await tx.order.create({
      data: {
        ...totals,
        userId,
        email,
        status: "PAID",
        currency: "usd",
        stripeCheckoutSessionId: sessionId,
        paidAt: placedAt,
        createdAt: placedAt,
        shippingAddress: {
          name: "Demo Customer",
          line1: "1 Example Way",
          city: "Portland",
          state: "OR",
          postalCode: "97205",
          country: "US",
        },
        items: { create: items },
      },
    });
  }, SEED_TRANSACTION_OPTIONS);
}

/** Seeds demo customers, a PAID order each, and their reviews. Returns the review count. */
export async function seedDemoReviews(db: PrismaClient, now: Date = new Date()): Promise<number> {
  const variants = await loadFirstVariants(db, [...new Set(seedReviews.map((r) => r.product))]);

  for (const customer of seedCustomers) {
    const user = await db.user.upsert({
      where: { email: customer.email },
      create: { email: customer.email, name: customer.name, emailVerified: now },
      update: { name: customer.name },
    });

    const reviews = seedReviews.filter((r) => r.customer === customer.key);
    const purchased = reviews.flatMap((r) => {
      const variant = variants.get(r.product);
      return variant ? [variant] : [];
    });
    await upsertDemoOrder(
      db,
      user.id,
      customer.email,
      `cs_seed_${customer.key}`,
      purchased,
      daysAgo(DEMO_ORDER_DAYS_AGO, now),
    );

    for (const review of reviews) {
      const variant = variants.get(review.product);
      if (!variant)
        throw new Error(`Seed review for unknown or inactive product "${review.product}"`);
      await db.review.upsert({
        where: { productId_userId: { productId: variant.productId, userId: user.id } },
        create: {
          productId: variant.productId,
          userId: user.id,
          rating: review.rating,
          body: review.body,
          createdAt: daysAgo(review.daysAgo, now),
        },
        update: { rating: review.rating, body: review.body },
      });
    }
  }

  const products = await db.product.findMany({ select: { id: true } });
  for (const product of products) {
    await syncProductRating(db, product.id);
  }
  return db.review.count();
}
