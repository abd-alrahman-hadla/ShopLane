/** Helpers for integration tests (test branch only; see integration-setup.ts). */
import { db } from "@/lib/db";

const TABLES = [
  "Review",
  "WishlistItem",
  "OrderItem",
  "Order",
  "CartItem",
  "Cart",
  "ProductImage",
  "Variant",
  "Product",
  "Category",
  "Coupon",
  "StripeEvent",
  "Session",
  "Account",
  "VerificationToken",
  "Address",
  "User",
] as const;

export const testDb = db;

export async function resetDatabase(): Promise<void> {
  const list = TABLES.map((table) => `"${table}"`).join(", ");
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

let sequence = 0;
function next(): number {
  sequence += 1;
  return sequence;
}

/** Creates an ACTIVE product with one variant. */
export async function createVariant(options: {
  stock: number;
  priceCents?: number;
  status?: "ACTIVE" | "DRAFT";
}) {
  const n = next();
  const category = await db.category.upsert({
    where: { slug: "test-category" },
    create: { slug: "test-category", name: "Test Category", description: "Test" },
    update: {},
  });
  const product = await db.product.create({
    data: {
      slug: `test-product-${n}`,
      name: `Test Product ${n}`,
      description: "A product for tests",
      status: options.status ?? "ACTIVE",
      categoryId: category.id,
      minPriceCents: options.priceCents ?? 1500,
      maxPriceCents: options.priceCents ?? 1500,
      images: {
        create: [{ url: "https://images.unsplash.com/photo-test", alt: "Test image", position: 0 }],
      },
    },
  });
  return db.variant.create({
    data: {
      productId: product.id,
      sku: `TEST-${n}`,
      title: "Default",
      priceCents: options.priceCents ?? 1500,
      stock: options.stock,
    },
  });
}

export async function createCoupon(options: {
  code: string;
  type?: "PERCENTAGE" | "FIXED_AMOUNT";
  value?: number;
  maxRedemptions?: number | null;
  redemptionCount?: number;
  endsAt?: Date | null;
}) {
  return db.coupon.create({
    data: {
      code: options.code,
      type: options.type ?? "PERCENTAGE",
      value: options.value ?? 10,
      maxRedemptions: options.maxRedemptions ?? null,
      redemptionCount: options.redemptionCount ?? 0,
      endsAt: options.endsAt ?? null,
    },
  });
}

export async function createUser(options: { email?: string; name?: string } = {}) {
  const n = next();
  return db.user.create({
    data: { email: options.email ?? `user${n}@example.com`, name: options.name ?? `Test User${n}` },
  });
}

export async function getVariantStock(variantId: string): Promise<number> {
  const variant = await db.variant.findUniqueOrThrow({
    where: { id: variantId },
    select: { stock: true },
  });
  return variant.stock;
}
