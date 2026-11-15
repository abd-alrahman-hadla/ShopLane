import { describe, expect, it } from "vitest";
import {
  CHECKOUT_SESSION_TTL_SECONDS,
  buildCheckoutSessionParams,
  buildOrderCouponParams,
  type OrderForStripe,
} from "./stripe-session";

const order: OrderForStripe = {
  id: "ord_1",
  number: 42,
  currency: "usd",
  email: "buyer@example.com",
  shippingCents: 600,
  discountCents: 420,
  couponCode: "WELCOME10",
  items: [
    {
      productName: "Ethiopia Yirgacheffe Kochere",
      variantTitle: "250 g",
      imageUrl: "https://images.unsplash.com/photo-1",
      unitPriceCents: 2100,
      quantity: 2,
    },
    {
      productName: "Cone Paper Filters",
      variantTitle: "100 pack",
      imageUrl: null,
      unitPriceCents: 800,
      quantity: 1,
    },
  ],
};

const now = new Date("2026-11-15T12:00:00Z");

describe("buildCheckoutSessionParams", () => {
  const params = buildCheckoutSessionParams(order, {
    siteUrl: "http://localhost:3000/",
    now,
    stripeCouponId: "co_123",
  });

  it("prices line items from the order snapshot", () => {
    expect(params.line_items).toEqual([
      {
        quantity: 2,
        price_data: {
          currency: "usd",
          unit_amount: 2100,
          product_data: {
            name: "Ethiopia Yirgacheffe Kochere (250 g)",
            images: ["https://images.unsplash.com/photo-1"],
          },
        },
      },
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: 800,
          product_data: { name: "Cone Paper Filters (100 pack)" },
        },
      },
    ]);
  });

  it("links the session to the order", () => {
    expect(params.client_reference_id).toBe("ord_1");
    expect(params.metadata).toEqual({ orderId: "ord_1", orderNumber: "SL-0042" });
    expect(params.payment_intent_data?.metadata).toEqual({ orderId: "ord_1" });
    expect(params.customer_email).toBe("buyer@example.com");
  });

  it("applies the one-off coupon and fixed shipping", () => {
    expect(params.discounts).toEqual([{ coupon: "co_123" }]);
    const rate = params.shipping_options?.[0]?.shipping_rate_data;
    expect(rate?.fixed_amount).toEqual({ amount: 600, currency: "usd" });
    expect(rate?.display_name).toBe("Standard shipping");
    expect(params.shipping_address_collection).toEqual({ allowed_countries: ["US"] });
  });

  it("expires the session after the TTL and builds absolute URLs", () => {
    expect(params.expires_at).toBe(now.getTime() / 1000 + CHECKOUT_SESSION_TTL_SECONDS);
    expect(params.success_url).toBe(
      "http://localhost:3000/checkout/success?session_id={CHECKOUT_SESSION_ID}",
    );
    expect(params.cancel_url).toBe("http://localhost:3000/cart?checkout=cancelled");
  });

  it("omits discounts and labels free shipping when applicable", () => {
    const plain = buildCheckoutSessionParams(
      { ...order, discountCents: 0, couponCode: null, shippingCents: 0, email: null },
      { siteUrl: "https://shoplane.example", now },
    );
    expect(plain.discounts).toBeUndefined();
    expect(plain.customer_email).toBeUndefined();
    expect(plain.shipping_options?.[0]?.shipping_rate_data?.display_name).toBe("Free shipping");
  });
});

describe("buildOrderCouponParams", () => {
  it("creates a single-use coupon for the exact discount", () => {
    expect(buildOrderCouponParams(order)).toEqual({
      amount_off: 420,
      currency: "usd",
      duration: "once",
      max_redemptions: 1,
      name: "WELCOME10",
      metadata: { orderId: "ord_1" },
    });
  });
});
