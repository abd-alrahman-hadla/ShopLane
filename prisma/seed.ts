import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";
import { seedAdminUser, seedCatalog, seedCouponRows } from "./seed-catalog";
import { seedDemoReviews } from "./seed-demo";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed with NODE_ENV=production.");
  }

  const db = new PrismaClient({
    adapter: new PrismaNeon({ connectionString: requireEnv("DATABASE_URL") }),
  });
  try {
    await seedCatalog(db);
    const adminEmail = process.env.SEED_ADMIN_EMAIL;
    if (adminEmail) await seedAdminUser(db, adminEmail);
    else console.warn("SEED_ADMIN_EMAIL not set: skipping admin user.");
    await seedCouponRows(db);
    const reviews = await seedDemoReviews(db);

    const [categories, products, variants, images, demoOrders] = await Promise.all([
      db.category.count(),
      db.product.count(),
      db.variant.count(),
      db.productImage.count(),
      db.order.count({ where: { stripeCheckoutSessionId: { startsWith: "cs_seed_" } } }),
    ]);
    console.log(
      `Seeded ${categories} categories, ${products} products, ${variants} variants, ${images} images, ` +
        `${demoOrders} demo orders, ${reviews} reviews.`,
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
