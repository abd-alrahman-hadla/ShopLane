/**
 * E2E auth and fixtures. ShopLane uses database sessions, so tests sign in by
 * inserting Session rows and sending the token as the Auth.js cookie.
 *
 * Writes to the dev DB are limited to: e2e@example.com (customer),
 * e2e-admin@example.com (admin), their orders, products with an `e2e-` slug,
 * coupons starting with E2E, and the e2e admin's audit rows. Teardown removes all of it.
 */
import { randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";

export const E2E_USER_EMAIL = "e2e@example.com";
export const E2E_USER_NAME = "Casey Tester";
export const E2E_ADMIN_EMAIL = "e2e-admin@example.com";
export const STORAGE_STATE = "e2e/.auth/user.json";
export const ADMIN_STORAGE_STATE = "e2e/.auth/admin.json";
/** Seeded variant used for the e2e order (Cone Paper Filters, 100 pack). */
const E2E_ORDER_SKU = "CA-CPF-100";

/** cuid-length IDs (25 chars), like the ones Prisma generates. */
function shortId(): string {
  return `e2e${randomBytes(11).toString("hex")}`;
}

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required for authenticated e2e tests.");
  return neon(url);
}

/** Removes everything the e2e run may have created. */
export async function cleanupE2EData(): Promise<void> {
  const query = sql();
  const emails = [E2E_USER_EMAIL, E2E_ADMIN_EMAIL];
  await query`delete from "Order" where email = any(${emails}) or "userId" in (select id from "User" where email = any(${emails}))`;
  await query`delete from "AuditLog" where "actorEmail" = ${E2E_ADMIN_EMAIL}`;
  await query`delete from "Coupon" where code like 'E2E%'`;
  await query`delete from "Product" where slug like 'e2e-%'`;
  await query`delete from "User" where email = any(${emails})`;
}

async function createUserWithSession(email: string, name: string, role: "CUSTOMER" | "ADMIN") {
  const query = sql();
  const userId = shortId();
  const token = randomBytes(32).toString("hex");
  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  await query`
    insert into "User" (id, email, name, role, "emailVerified", "createdAt", "updatedAt")
    values (${userId}, ${email}, ${name}, ${role}, ${now}, ${now}, ${now})`;
  await query`
    insert into "Session" ("sessionToken", "userId", expires, "createdAt", "updatedAt")
    values (${token}, ${userId}, ${expires}, ${now}, ${now})`;
  return { userId, token };
}

/** A PAID order for the e2e customer, for the admin shipping flow. Returns its number. */
async function createPaidOrder(userId: string): Promise<number> {
  const query = sql();
  const [variant] = await query`
    select v.id, v.sku, v.title, v."priceCents", p.name from "Variant" v join "Product" p on p.id = v."productId"
    where v.sku = ${E2E_ORDER_SKU}`;
  if (!variant) throw new Error(`Seeded variant ${E2E_ORDER_SKU} not found. Run npm run db:seed.`);
  const orderId = shortId();
  const now = new Date();
  const [order] = await query`
    insert into "Order" (id, "userId", email, status, currency, "subtotalCents", "totalCents", "paidAt", "createdAt", "updatedAt")
    values (${orderId}, ${userId}, ${E2E_USER_EMAIL}, 'PAID', 'usd', ${variant.priceCents}, ${variant.priceCents}, ${now}, ${now}, ${now})
    returning number`;
  await query`
    insert into "OrderItem" (id, "orderId", "variantId", "productName", "variantTitle", sku, "unitPriceCents", quantity, "lineTotalCents")
    values (${shortId()}, ${orderId}, ${variant.id}, ${variant.name}, ${variant.title}, ${variant.sku}, ${variant.priceCents}, 1, ${variant.priceCents})`;
  return Number(order?.number);
}

export type E2EFixtures = { customerToken: string; adminToken: string; orderNumber: number };

/** Fresh customer + admin sessions and one paid order. */
export async function createE2EFixtures(): Promise<E2EFixtures> {
  await cleanupE2EData();
  const customer = await createUserWithSession(E2E_USER_EMAIL, E2E_USER_NAME, "CUSTOMER");
  const admin = await createUserWithSession(E2E_ADMIN_EMAIL, "Avery Admin", "ADMIN");
  const orderNumber = await createPaidOrder(customer.userId);
  return { customerToken: customer.token, adminToken: admin.token, orderNumber };
}
