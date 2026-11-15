import { describe, expect, it } from "vitest";
import { couponFormSchema, type CouponFormInput } from "./schemas";

const valid: CouponFormInput = {
  code: " spring10 ",
  type: "PERCENTAGE",
  value: 10,
  minSubtotalCents: null,
  maxRedemptions: null,
  startsAt: "",
  endsAt: "",
  isActive: true,
};

describe("couponFormSchema", () => {
  it("normalizes the code and empty dates", () => {
    expect(couponFormSchema.parse(valid)).toMatchObject({
      code: "SPRING10",
      startsAt: null,
      endsAt: null,
    });
  });

  it("caps percentages at 100 and fixed amounts at $10,000", () => {
    expect(couponFormSchema.safeParse({ ...valid, value: 101 }).success).toBe(false);
    expect(couponFormSchema.safeParse({ ...valid, value: 100 }).success).toBe(true);
    expect(couponFormSchema.safeParse({ ...valid, type: "FIXED_AMOUNT", value: 500 }).success).toBe(
      true,
    );
    expect(
      couponFormSchema.safeParse({ ...valid, type: "FIXED_AMOUNT", value: 1_000_001 }).success,
    ).toBe(false);
  });

  it("requires the window to end after it starts", () => {
    const start = "2026-12-01T00:00:00.000Z";
    expect(couponFormSchema.safeParse({ ...valid, startsAt: start, endsAt: start }).success).toBe(
      false,
    );
    expect(
      couponFormSchema.safeParse({ ...valid, startsAt: start, endsAt: "2026-12-31T00:00:00.000Z" })
        .success,
    ).toBe(true);
  });

  it("rejects bad codes, zero values and fractional cents", () => {
    for (const code of ["ab", "has space", "x".repeat(33), "emoji🎉"]) {
      expect(couponFormSchema.safeParse({ ...valid, code }).success, code).toBe(false);
    }
    expect(couponFormSchema.safeParse({ ...valid, value: 0 }).success).toBe(false);
    expect(couponFormSchema.safeParse({ ...valid, minSubtotalCents: 12.5 }).success).toBe(false);
  });

  it("rejects fields the admin can't set, like the redemption count", () => {
    expect(couponFormSchema.safeParse({ ...valid, redemptionCount: 0 }).success).toBe(false);
  });
});
