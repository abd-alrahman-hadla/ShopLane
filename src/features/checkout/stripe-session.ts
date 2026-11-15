import type Stripe from "stripe";
import { formatOrderNumber } from "./order-number";

/** Stripe requires 30 min – 24 h; one extra minute absorbs clock skew. */
export const CHECKOUT_SESSION_TTL_SECONDS = 31 * 60;

export type OrderForStripe = {
  id: string;
  number: number;
  currency: string;
  email: string | null;
  shippingCents: number;
  discountCents: number;
  couponCode: string | null;
  items: Array<{
    productName: string;
    variantTitle: string;
    imageUrl: string | null;
    unitPriceCents: number;
    quantity: number;
  }>;
};

type SessionOptions = {
  siteUrl: string;
  now: Date;
  /** One-off Stripe coupon matching `discountCents` exactly (see checkout.ts). */
  stripeCouponId?: string | null;
};

/** Parameters for a Checkout Session built only from the order's DB snapshot. */
export function buildCheckoutSessionParams(
  order: OrderForStripe,
  { siteUrl, now, stripeCouponId }: SessionOptions,
): Stripe.Checkout.SessionCreateParams {
  const base = siteUrl.replace(/\/$/, "");
  return {
    mode: "payment",
    client_reference_id: order.id,
    customer_email: order.email ?? undefined,
    metadata: { orderId: order.id, orderNumber: formatOrderNumber(order.number) },
    payment_intent_data: { metadata: { orderId: order.id } },
    line_items: order.items.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: order.currency,
        unit_amount: item.unitPriceCents,
        product_data: {
          name: `${item.productName} (${item.variantTitle})`,
          ...(item.imageUrl ? { images: [item.imageUrl] } : {}),
        },
      },
    })),
    ...(stripeCouponId ? { discounts: [{ coupon: stripeCouponId }] } : {}),
    shipping_address_collection: { allowed_countries: ["US"] },
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: order.shippingCents === 0 ? "Free shipping" : "Standard shipping",
          fixed_amount: { amount: order.shippingCents, currency: order.currency },
          delivery_estimate: {
            minimum: { unit: "business_day", value: 3 },
            maximum: { unit: "business_day", value: 5 },
          },
        },
      },
    ],
    expires_at: Math.floor(now.getTime() / 1000) + CHECKOUT_SESSION_TTL_SECONDS,
    success_url: `${base}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/cart?checkout=cancelled`,
  };
}

/** A single-use Stripe coupon for exactly this order's discount. */
export function buildOrderCouponParams(order: OrderForStripe): Stripe.CouponCreateParams {
  return {
    amount_off: order.discountCents,
    currency: order.currency,
    duration: "once",
    max_redemptions: 1,
    name: order.couponCode ?? "Discount",
    metadata: { orderId: order.id },
  };
}
