import type { Discount } from "./pricing";

export type CouponRecord = {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED_AMOUNT";
  value: number;
  minSubtotalCents: number | null;
  maxRedemptions: number | null;
  redemptionCount: number;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
};

export type CouponRejection =
  "not_found" | "inactive" | "not_started" | "expired" | "usage_limit_reached" | "below_minimum";

export type CouponEvaluation =
  | { ok: true; coupon: CouponRecord; discount: Discount }
  | { ok: false; reason: CouponRejection; minSubtotalCents?: number };

export const COUPON_MESSAGES: Record<CouponRejection, string> = {
  not_found: "That code isn’t valid.",
  inactive: "That code is no longer active.",
  not_started: "That code isn’t active yet.",
  expired: "That code has expired.",
  usage_limit_reached: "That code has been fully redeemed.",
  below_minimum: "Your order doesn’t meet this code’s minimum.",
};

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Checks whether a coupon can be applied right now. `startsAt` is inclusive and
 * `endsAt` exclusive. Usage limits are checked here for a fast answer and
 * enforced atomically when the redemption is reserved (see orders.ts).
 */
export function evaluateCoupon(
  coupon: CouponRecord | null,
  context: { subtotalCents: number; now: Date },
): CouponEvaluation {
  if (!coupon) return { ok: false, reason: "not_found" };
  if (!coupon.isActive) return { ok: false, reason: "inactive" };
  if (coupon.startsAt && context.now < coupon.startsAt) return { ok: false, reason: "not_started" };
  if (coupon.endsAt && context.now >= coupon.endsAt) return { ok: false, reason: "expired" };
  if (coupon.maxRedemptions !== null && coupon.redemptionCount >= coupon.maxRedemptions) {
    return { ok: false, reason: "usage_limit_reached" };
  }
  if (coupon.minSubtotalCents !== null && context.subtotalCents < coupon.minSubtotalCents) {
    return { ok: false, reason: "below_minimum", minSubtotalCents: coupon.minSubtotalCents };
  }
  return { ok: true, coupon, discount: { type: coupon.type, value: coupon.value } };
}
