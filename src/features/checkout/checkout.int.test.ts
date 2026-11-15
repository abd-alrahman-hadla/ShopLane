import { beforeEach, describe, expect, it } from "vitest";
import { cartQuoteInputSchema } from "@/features/cart/schemas";
import { createCoupon, createVariant, resetDatabase, testDb } from "@/test/db";
import { asStripeGateway, createFakeStripe, type FakeStripe } from "@/test/fake-stripe";
import { beginCheckout, type CheckoutDeps } from "./checkout";
import { SHIPPING_FLAT_CENTS } from "./pricing";

let stripe: FakeStripe;
const deps = (): CheckoutDeps => ({
  db: testDb,
  stripe: asStripeGateway(stripe),
  siteUrl: "http://localhost:3000",
  now: () => new Date(),
});

beforeEach(async () => {
  await resetDatabase();
  stripe = createFakeStripe();
});

describe("beginCheckout", () => {
  it("snapshots prices from the database into a PENDING order", async () => {
    const variant = await createVariant({ stock: 5, priceCents: 2100 });

    const result = await beginCheckout(deps(), { items: [{ variantId: variant.id, quantity: 2 }] });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const order = await testDb.order.findUniqueOrThrow({
      where: { id: result.orderId },
      include: { items: true },
    });
    expect(order).toMatchObject({
      status: "PENDING",
      subtotalCents: 4200,
      shippingCents: SHIPPING_FLAT_CENTS,
      totalCents: 4200 + SHIPPING_FLAT_CENTS,
      stripeCheckoutSessionId: expect.stringMatching(/^cs_test_/),
    });
    expect(order.items).toHaveLength(1);
    expect(order.items[0]).toMatchObject({
      unitPriceCents: 2100,
      quantity: 2,
      lineTotalCents: 4200,
      sku: variant.sku,
    });

    // Stripe receives the DB price, not anything from the client.
    const params = stripe.checkout.sessions.create.mock.calls[0]?.[0];
    expect(params?.line_items?.[0]?.price_data?.unit_amount).toBe(2100);
  });

  it("rejects client input that carries prices", () => {
    const tampered = { items: [{ variantId: "v1", quantity: 1, priceCents: 1 }], couponCode: null };
    expect(cartQuoteInputSchema.safeParse(tampered).success).toBe(false);
  });

  it("does not decrement stock at checkout (stock comes off on payment)", async () => {
    const variant = await createVariant({ stock: 3 });
    await beginCheckout(deps(), { items: [{ variantId: variant.id, quantity: 2 }] });
    const after = await testDb.variant.findUniqueOrThrow({ where: { id: variant.id } });
    expect(after.stock).toBe(3);
  });

  it("refuses quantities above available stock", async () => {
    const variant = await createVariant({ stock: 1 });
    const result = await beginCheckout(deps(), { items: [{ variantId: variant.id, quantity: 2 }] });
    expect(result).toEqual({
      ok: false,
      error: "cart_changed",
      problems: [{ variantId: variant.id, status: "insufficient", available: 1 }],
    });
    expect(await testDb.order.count()).toBe(0);
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("refuses draft products", async () => {
    const variant = await createVariant({ stock: 5, status: "DRAFT" });
    const result = await beginCheckout(deps(), { items: [{ variantId: variant.id, quantity: 1 }] });
    expect(result).toMatchObject({ ok: false, error: "cart_changed" });
  });

  it("applies a coupon, reserves a redemption and passes an exact one-off coupon to Stripe", async () => {
    const variant = await createVariant({ stock: 5, priceCents: 2100 });
    const coupon = await createCoupon({ code: "WELCOME10", value: 10, maxRedemptions: 5 });

    const result = await beginCheckout(deps(), {
      items: [{ variantId: variant.id, quantity: 2 }],
      couponCode: " welcome10 ",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const order = await testDb.order.findUniqueOrThrow({ where: { id: result.orderId } });
    expect(order).toMatchObject({
      discountCents: 420,
      couponCode: "WELCOME10",
      couponId: coupon.id,
    });
    expect(
      (await testDb.coupon.findUniqueOrThrow({ where: { id: coupon.id } })).redemptionCount,
    ).toBe(1);
    expect(stripe.coupons.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount_off: 420, max_redemptions: 1 }),
      { idempotencyKey: `order-coupon-${order.id}` },
    );
  });

  it("rejects an expired coupon without creating an order", async () => {
    const variant = await createVariant({ stock: 5 });
    await createCoupon({ code: "OLD", endsAt: new Date(Date.now() - 1000) });
    const result = await beginCheckout(deps(), {
      items: [{ variantId: variant.id, quantity: 1 }],
      couponCode: "OLD",
    });
    expect(result).toEqual({
      ok: false,
      error: "coupon_rejected",
      message: "That code has expired.",
    });
    expect(await testDb.order.count()).toBe(0);
  });

  it("lets only one of two concurrent checkouts take the last coupon redemption", async () => {
    const variant = await createVariant({ stock: 10 });
    const coupon = await createCoupon({ code: "LASTONE", maxRedemptions: 1 });

    const results = await Promise.all([
      beginCheckout(deps(), {
        items: [{ variantId: variant.id, quantity: 1 }],
        couponCode: "LASTONE",
      }),
      beginCheckout(deps(), {
        items: [{ variantId: variant.id, quantity: 1 }],
        couponCode: "LASTONE",
      }),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toEqual([
      { ok: false, error: "coupon_rejected", message: "That code has been fully redeemed." },
    ]);
    expect(
      (await testDb.coupon.findUniqueOrThrow({ where: { id: coupon.id } })).redemptionCount,
    ).toBe(1);
  });

  it("cancels the order and releases the coupon when Stripe fails", async () => {
    const variant = await createVariant({ stock: 5 });
    const coupon = await createCoupon({ code: "SAVE", maxRedemptions: 1 });
    stripe.checkout.sessions.create.mockRejectedValueOnce(new Error("Stripe is down"));

    const result = await beginCheckout(deps(), {
      items: [{ variantId: variant.id, quantity: 1 }],
      couponCode: "SAVE",
    });

    expect(result).toEqual({ ok: false, error: "payment_unavailable" });
    const order = await testDb.order.findFirstOrThrow();
    expect(order).toMatchObject({ status: "CANCELLED", cancelReason: "payment_failed" });
    expect(
      (await testDb.coupon.findUniqueOrThrow({ where: { id: coupon.id } })).redemptionCount,
    ).toBe(0);
  });
});
