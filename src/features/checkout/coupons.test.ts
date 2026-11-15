import { describe, expect, it } from "vitest";
import { evaluateCoupon, normalizeCouponCode, type CouponRecord } from "./coupons";

const now = new Date("2026-11-15T12:00:00Z");

function coupon(overrides: Partial<CouponRecord> = {}): CouponRecord {
  return {
    id: "c1",
    code: "WELCOME10",
    type: "PERCENTAGE",
    value: 10,
    minSubtotalCents: null,
    maxRedemptions: null,
    redemptionCount: 0,
    startsAt: null,
    endsAt: null,
    isActive: true,
    ...overrides,
  };
}

const ctx = { subtotalCents: 4000, now };

describe("normalizeCouponCode", () => {
  it("trims and upper-cases", () => {
    expect(normalizeCouponCode("  welcome10 ")).toBe("WELCOME10");
  });
});

describe("evaluateCoupon", () => {
  it("accepts a valid percentage coupon", () => {
    const result = evaluateCoupon(coupon(), ctx);
    expect(result).toMatchObject({ ok: true, discount: { type: "PERCENTAGE", value: 10 } });
  });

  it("accepts a valid fixed coupon", () => {
    const result = evaluateCoupon(coupon({ type: "FIXED_AMOUNT", value: 500 }), ctx);
    expect(result).toMatchObject({ ok: true, discount: { type: "FIXED_AMOUNT", value: 500 } });
  });

  it("rejects a missing coupon", () => {
    expect(evaluateCoupon(null, ctx)).toEqual({ ok: false, reason: "not_found" });
  });

  it("rejects an inactive coupon", () => {
    expect(evaluateCoupon(coupon({ isActive: false }), ctx)).toEqual({
      ok: false,
      reason: "inactive",
    });
  });

  it("treats startsAt as inclusive", () => {
    expect(evaluateCoupon(coupon({ startsAt: new Date(now.getTime() + 1) }), ctx)).toEqual({
      ok: false,
      reason: "not_started",
    });
    expect(evaluateCoupon(coupon({ startsAt: now }), ctx).ok).toBe(true);
  });

  it("treats endsAt as exclusive", () => {
    expect(evaluateCoupon(coupon({ endsAt: now }), ctx)).toEqual({ ok: false, reason: "expired" });
    expect(evaluateCoupon(coupon({ endsAt: new Date(now.getTime() + 1) }), ctx).ok).toBe(true);
  });

  it("rejects a coupon at its usage limit", () => {
    expect(evaluateCoupon(coupon({ maxRedemptions: 5, redemptionCount: 5 }), ctx)).toEqual({
      ok: false,
      reason: "usage_limit_reached",
    });
    expect(evaluateCoupon(coupon({ maxRedemptions: 5, redemptionCount: 4 }), ctx).ok).toBe(true);
  });

  it("enforces the minimum subtotal", () => {
    const min = coupon({ type: "FIXED_AMOUNT", value: 500, minSubtotalCents: 4000 });
    expect(evaluateCoupon(min, { subtotalCents: 3999, now })).toEqual({
      ok: false,
      reason: "below_minimum",
      minSubtotalCents: 4000,
    });
    expect(evaluateCoupon(min, { subtotalCents: 4000, now }).ok).toBe(true);
  });

  it("checks the window before the usage limit", () => {
    expect(
      evaluateCoupon(coupon({ endsAt: now, maxRedemptions: 1, redemptionCount: 1 }), ctx),
    ).toEqual({
      ok: false,
      reason: "expired",
    });
  });
});
