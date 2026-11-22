/**
 * Nightly reset for the public demo (run before `npm run db:seed`):
 *  - products created by demo visitors are archived (hidden, kept for order history),
 *  - coupons created by demo visitors are deactivated,
 *  - expired sessions are removed.
 * The seed that follows restores seeded products, stock, prices, images and coupons.
 *
 * Refuses to run unless DEMO_MODE=true, so it can never touch a real store.
 */
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";
import { seedCoupons, seedProducts } from "./seed-data";

async function main(): Promise<void> {
  if (process.env.DEMO_MODE !== "true") {
    throw new Error("demo-reset only runs with DEMO_MODE=true (the public demo database).");
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required.");

  const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
  try {
    const products = await db.product.updateMany({
      where: {
        slug: { notIn: seedProducts.map((product) => product.slug) },
        status: { not: "ARCHIVED" },
      },
      data: { status: "ARCHIVED", featured: false },
    });
    const coupons = await db.coupon.updateMany({
      where: { code: { notIn: seedCoupons.map((coupon) => coupon.code) }, isActive: true },
      data: { isActive: false },
    });
    const sessions = await db.session.deleteMany({ where: { expires: { lt: new Date() } } });
    console.log(
      `Demo reset: archived ${products.count} visitor products, deactivated ${coupons.count} visitor coupons, ` +
        `removed ${sessions.count} expired sessions. Now run the seed.`,
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
