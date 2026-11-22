/**
 * Nightly reset for the public demo (GitHub Actions → demo-reset.yml).
 * Same logic as the admin's "Reset demo data" button (src/features/demo/reset.ts),
 * plus the SEED_ADMIN_EMAIL admin user when that is set.
 *
 * Refuses to run unless DEMO_MODE=true, so it can never touch a real store.
 */
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";
import { resetDemoData } from "../src/features/demo/reset";
import { seedAdminUser } from "./seed-catalog";

async function main(): Promise<void> {
  if (process.env.DEMO_MODE !== "true") {
    throw new Error("demo-reset only runs with DEMO_MODE=true (the public demo database).");
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required.");

  const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
  try {
    const summary = await resetDemoData(db, { actor: { id: null, email: "system" } });
    const adminEmail = process.env.SEED_ADMIN_EMAIL;
    if (adminEmail) await seedAdminUser(db, adminEmail);
    console.log(
      `Demo reset: archived ${summary.archivedProducts} visitor products, deactivated ` +
        `${summary.deactivatedCoupons} visitor coupons, removed ${summary.removedSessions} expired ` +
        `sessions; restored ${summary.restoredProducts} products, ${summary.restoredCoupons} coupons ` +
        `and ${summary.reviews} reviews.`,
    );
    console.log("Cached store pages refresh within the hour; redeploy to see them immediately.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
