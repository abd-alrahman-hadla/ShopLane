import { sentEmails, signInAs } from "@/test/admin";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDemoDataAction } from "@/features/admin/demo/actions";
import { createCoupon, createUser, createVariant, resetDatabase, testDb } from "@/test/db";
import { createTestOrder } from "@/test/orders";
import { resetDemoData } from "./reset";

const SYSTEM = { id: null, email: "system" };

beforeEach(async () => {
  await resetDatabase();
  sentEmails.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("resetDemoData", () => {
  it("restores the seeded store and undoes visitor changes", async () => {
    // A seeded catalog that visitors have since changed.
    await resetDemoData(testDb, { actor: SYSTEM });
    const mug = await testDb.product.findUniqueOrThrow({
      where: { slug: "stoneware-mug" },
      include: { variants: true },
    });
    const seededVariant = mug.variants[0]!;
    const unordered = await testDb.variant.create({
      data: { productId: mug.id, sku: "VISITOR-1", title: "Visitor", priceCents: 999, stock: 5 },
    });
    const ordered = await testDb.variant.create({
      data: { productId: mug.id, sku: "VISITOR-2", title: "Visitor 2", priceCents: 999, stock: 5 },
    });
    await createTestOrder({ items: [{ variantId: ordered.id, quantity: 1 }], status: "PAID" });
    await testDb.product.update({
      where: { id: mug.id },
      data: { name: "Renamed by a visitor", status: "ARCHIVED", seoTitle: "Spam" },
    });
    await testDb.variant.update({
      where: { id: seededVariant.id },
      data: { stock: 0, priceCents: 1 },
    });
    const visitorProduct = await createVariant({ stock: 3 });
    await createCoupon({ code: "VISITOR50" });
    await testDb.coupon.update({ where: { code: "WELCOME10" }, data: { isActive: false } });

    const summary = await resetDemoData(testDb, { actor: SYSTEM });

    expect(summary).toMatchObject({
      archivedProducts: 1,
      deactivatedCoupons: 1,
      restoredProducts: 40,
    });
    const restored = await testDb.product.findUniqueOrThrow({
      where: { id: mug.id },
      include: { variants: { orderBy: { sku: "asc" } } },
    });
    expect(restored).toMatchObject({ name: "Stoneware Mug", status: "ACTIVE", seoTitle: null });
    const variantById = new Map(restored.variants.map((variant) => [variant.id, variant]));
    expect(variantById.get(seededVariant.id)?.stock).toBe(seededVariant.stock);
    expect(variantById.get(seededVariant.id)?.priceCents).toBe(seededVariant.priceCents);
    expect(variantById.has(unordered.id)).toBe(false);
    expect(variantById.get(ordered.id)?.stock).toBe(0);
    expect(
      await testDb.product.findUniqueOrThrow({ where: { id: visitorProduct.productId } }),
    ).toMatchObject({ status: "ARCHIVED" });
    expect(await testDb.coupon.findUniqueOrThrow({ where: { code: "VISITOR50" } })).toMatchObject({
      isActive: false,
    });
    expect(await testDb.coupon.findUniqueOrThrow({ where: { code: "WELCOME10" } })).toMatchObject({
      isActive: true,
    });
    expect(await testDb.auditLog.count({ where: { action: "demo.reset" } })).toBe(2);
  });
});

describe("resetDemoDataAction", () => {
  async function signInAdmin() {
    const admin = await createUser({ email: "demo-admin@shoplane.dev" });
    await testDb.user.update({ where: { id: admin.id }, data: { role: "ADMIN" } });
    signInAs({ id: admin.id, email: admin.email, role: "ADMIN" });
    return admin;
  }

  it("is refused outside demo mode", async () => {
    vi.stubEnv("DEMO_MODE", "");
    await signInAdmin();
    expect(await resetDemoDataAction({})).toEqual({
      ok: false,
      error: "Demo data can only be reset when the store runs in demo mode.",
    });
    expect(await testDb.product.count()).toBe(0);
  });

  it("resets as the signed-in admin, audits it, and then cools down", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    const admin = await signInAdmin();

    const first = await resetDemoDataAction({});
    expect(first).toMatchObject({ ok: true, data: { restoredProducts: 40, restoredCoupons: 2 } });
    expect(await testDb.product.count({ where: { status: "ACTIVE" } })).toBe(38);
    const audit = await testDb.auditLog.findFirstOrThrow({ where: { action: "demo.reset" } });
    expect(audit).toMatchObject({ actorId: admin.id, entityType: "Store" });

    const second = await resetDemoDataAction({});
    expect(second.ok).toBe(false);
    expect(second.ok ? "" : second.error).toMatch(/Try again in \d+ seconds/);
  });
});
