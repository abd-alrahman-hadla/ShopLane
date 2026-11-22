import type { PrismaClient } from "@/generated/prisma/client";
import { writeAudit } from "@/features/admin/audit";
import {
  SEED_TRANSACTION_OPTIONS,
  seedCatalog,
  seedCouponRows,
} from "../../../prisma/seed-catalog";
import { seedCoupons, seedProducts } from "../../../prisma/seed-data";
import { seedDemoReviews } from "../../../prisma/seed-demo";

/**
 * Puts the public demo back to its seeded state. Used by the admin's
 * "Reset demo data" button and by the nightly workflow (prisma/demo-reset.ts).
 *
 * 1. In one transaction, with its audit row: archive products visitors created
 *    (kept for order history), deactivate coupons they created, drop expired sessions.
 * 2. Re-seed (idempotent): categories, products, variants, stock, prices, images,
 *    SEO fields, coupons, demo customers with their orders and reviews.
 *
 * Step 2 runs in many small transactions, so it also works over a slow link. If it
 * stops part-way, running the reset again finishes it.
 */
export type DemoResetSummary = {
  archivedProducts: number;
  deactivatedCoupons: number;
  removedSessions: number;
  restoredProducts: number;
  restoredCoupons: number;
  reviews: number;
};

export type DemoResetActor = { id: string | null; email: string };

/** One reset per minute: the button is public in the demo, and a reset is ~hundreds of writes. */
export const DEMO_RESET_COOLDOWN_MS = 60_000;

export function cooldownRemainingMs(lastResetAt: Date | null, now: Date): number {
  if (!lastResetAt) return 0;
  return Math.max(0, lastResetAt.getTime() + DEMO_RESET_COOLDOWN_MS - now.getTime());
}

export async function lastDemoResetAt(db: PrismaClient): Promise<Date | null> {
  const row = await db.auditLog.findFirst({
    where: { action: "demo.reset" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return row?.createdAt ?? null;
}

export async function resetDemoData(
  db: PrismaClient,
  { actor, now = new Date() }: { actor: DemoResetActor; now?: Date },
): Promise<DemoResetSummary & { touchedSlugs: string[] }> {
  const seededSlugs = seedProducts.map((product) => product.slug);
  const seededCodes = seedCoupons.map((coupon) => coupon.code);

  const cleanup = await db.$transaction(async (tx) => {
    const visitorProducts = await tx.product.findMany({
      where: { slug: { notIn: seededSlugs }, status: { not: "ARCHIVED" } },
      select: { slug: true },
    });
    const products = await tx.product.updateMany({
      where: { slug: { in: visitorProducts.map((product) => product.slug) } },
      data: { status: "ARCHIVED", featured: false },
    });
    const coupons = await tx.coupon.updateMany({
      where: { code: { notIn: seededCodes }, isActive: true },
      data: { isActive: false },
    });
    const sessions = await tx.session.deleteMany({ where: { expires: { lt: now } } });
    await writeAudit(tx, actor, {
      action: "demo.reset",
      entityType: "Store",
      entityId: "demo",
      summary:
        `Reset demo data: archived ${products.count} visitor products, ` +
        `deactivated ${coupons.count} visitor coupons, restored the seeded catalog`,
    });
    return {
      archivedSlugs: visitorProducts.map((product) => product.slug),
      archivedProducts: products.count,
      deactivatedCoupons: coupons.count,
      removedSessions: sessions.count,
    };
  }, SEED_TRANSACTION_OPTIONS);

  const restoredSlugs = await seedCatalog(db);
  await seedCouponRows(db);
  const reviews = await seedDemoReviews(db, now);

  return {
    archivedProducts: cleanup.archivedProducts,
    deactivatedCoupons: cleanup.deactivatedCoupons,
    removedSessions: cleanup.removedSessions,
    restoredProducts: restoredSlugs.length,
    restoredCoupons: seededCodes.length,
    reviews,
    touchedSlugs: [...restoredSlugs, ...cleanup.archivedSlugs],
  };
}
