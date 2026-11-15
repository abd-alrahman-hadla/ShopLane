/// <reference types="vite/client" />
import { sentEmails, signInAs, useFakeStripe } from "@/test/admin";
import { beforeEach, describe, expect, it } from "vitest";
import { createCoupon, createUser, createVariant, resetDatabase, testDb } from "@/test/db";

/**
 * Every exported Server Action under features/admin is discovered here and
 * must refuse non-admins before touching anything. A new action that skips
 * adminMutation fails this test automatically.
 */
const modules = import.meta.glob<Record<string, unknown>>("/src/features/admin/**/actions.ts", {
  eager: true,
});
const actions = Object.entries(modules).flatMap(([file, exports]) =>
  Object.entries(exports)
    .filter(
      (entry): entry is [string, (input: unknown) => Promise<unknown>] =>
        typeof entry[1] === "function",
    )
    .map(([name, fn]) => ({ label: `${file.replace("/src/features/admin/", "")}#${name}`, fn })),
);

/** Plausible inputs, so a missing guard would actually reach the database. */
async function plausibleInputs() {
  const variant = await createVariant({ stock: 5 });
  const coupon = await createCoupon({ code: "GUARD10" });
  const order = await testDb.order.create({
    data: {
      status: "PAID",
      email: "guard@example.com",
      subtotalCents: 1500,
      totalCents: 1500,
      stripePaymentIntentId: "pi_guard",
      items: {
        create: [
          {
            variantId: variant.id,
            productName: "P",
            variantTitle: "V",
            sku: variant.sku,
            unitPriceCents: 1500,
            quantity: 1,
            lineTotalCents: 1500,
          },
        ],
      },
    },
  });
  return {
    productId: variant.productId,
    orderId: order.id,
    couponId: coupon.id,
    isActive: false,
    carrier: "UPS",
    trackingNumber: "1Z999",
    requestId: "00000000-0000-4000-8000-000000000000",
    amountCents: 100,
    reason: "requested_by_customer",
    restock: [],
    code: "HACKED",
    type: "PERCENTAGE",
    value: 90,
    name: "Hacked",
    slug: "hacked",
    description: "Should never be saved.",
    categoryId: "x",
    status: "ACTIVE",
    featured: true,
    variants: [],
    images: [],
  };
}

beforeEach(async () => {
  await resetDatabase();
  useFakeStripe();
  sentEmails.mockClear();
});

describe("admin action guard", () => {
  it("discovers the admin actions", () => {
    const names = actions.map((action) => action.label);
    expect(names.length).toBeGreaterThanOrEqual(9);
    expect(names).toEqual(
      expect.arrayContaining([
        expect.stringContaining("#saveProduct"),
        expect.stringContaining("#refundOrder"),
      ]),
    );
  });

  for (const role of ["anonymous", "customer"] as const) {
    it(`refuses every action for ${role} users and changes nothing`, async () => {
      const input = await plausibleInputs();
      if (role === "customer") {
        const customer = await createUser({ email: "customer@example.com" });
        signInAs({ id: customer.id, email: customer.email, role: "CUSTOMER" });
      } else {
        signInAs(null);
      }
      const before = {
        order: await testDb.order.findFirstOrThrow({
          select: { status: true, refundedCents: true },
        }),
        coupon: await testDb.coupon.findFirstOrThrow({ select: { code: true, isActive: true } }),
        products: await testDb.product.count(),
      };

      for (const action of actions) {
        await expect(action.fn(input), action.label).resolves.toEqual({
          ok: false,
          error: "forbidden",
        });
      }

      expect(await testDb.auditLog.count()).toBe(0);
      expect(
        await testDb.order.findFirstOrThrow({ select: { status: true, refundedCents: true } }),
      ).toEqual(before.order);
      expect(
        await testDb.coupon.findFirstOrThrow({ select: { code: true, isActive: true } }),
      ).toEqual(before.coupon);
      expect(await testDb.product.count()).toBe(before.products);
      expect(sentEmails).not.toHaveBeenCalled();
    });
  }
});
