import { describe, expect, it } from "vitest";
import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  SHIPPING_FLAT_CENTS,
  computeOrderTotals,
  discountCents,
  lineTotalCents,
  shippingCents,
  subtotalCents,
} from "./pricing";

describe("line and subtotal", () => {
  it("multiplies unit price by quantity", () => {
    expect(lineTotalCents({ unitPriceCents: 2150, quantity: 3 })).toBe(6450);
  });

  it("sums lines", () => {
    expect(
      subtotalCents([
        { unitPriceCents: 2100, quantity: 2 },
        { unitPriceCents: 800, quantity: 1 },
      ]),
    ).toBe(5000);
  });

  it("rejects fractional cents and bad quantities", () => {
    expect(() => lineTotalCents({ unitPriceCents: 10.5, quantity: 1 })).toThrow(RangeError);
    expect(() => lineTotalCents({ unitPriceCents: 100, quantity: 0 })).toThrow(RangeError);
    expect(() => lineTotalCents({ unitPriceCents: 100, quantity: 1.5 })).toThrow(RangeError);
    expect(() => lineTotalCents({ unitPriceCents: -1, quantity: 1 })).toThrow(RangeError);
  });
});

describe("discountCents", () => {
  it("rounds percentage discounts half up", () => {
    // 15% of $33.33 = 499.95 cents → 500
    expect(discountCents(3333, { type: "PERCENTAGE", value: 15 })).toBe(500);
    // 10% of $0.05 = 0.5 cents → 1
    expect(discountCents(5, { type: "PERCENTAGE", value: 10 })).toBe(1);
  });

  it("caps fixed discounts at the subtotal", () => {
    expect(discountCents(300, { type: "FIXED_AMOUNT", value: 500 })).toBe(300);
    expect(discountCents(4000, { type: "FIXED_AMOUNT", value: 500 })).toBe(500);
  });

  it("clamps out-of-range percentages", () => {
    expect(discountCents(1000, { type: "PERCENTAGE", value: 150 })).toBe(1000);
    expect(discountCents(1000, { type: "PERCENTAGE", value: -10 })).toBe(0);
  });

  it("is zero without a discount or subtotal", () => {
    expect(discountCents(1000, null)).toBe(0);
    expect(discountCents(0, { type: "FIXED_AMOUNT", value: 500 })).toBe(0);
  });
});

describe("shippingCents", () => {
  it("charges flat shipping below the threshold", () => {
    expect(shippingCents(FREE_SHIPPING_THRESHOLD_CENTS - 1, 1)).toBe(SHIPPING_FLAT_CENTS);
  });

  it("is free at exactly the threshold", () => {
    expect(shippingCents(FREE_SHIPPING_THRESHOLD_CENTS, 1)).toBe(0);
  });

  it("is zero for an empty cart", () => {
    expect(shippingCents(0, 0)).toBe(0);
  });
});

describe("computeOrderTotals", () => {
  it("applies the discount before deciding on free shipping", () => {
    // $52 subtotal, 10% off → $46.80, below $50 → shipping applies
    const totals = computeOrderTotals([{ unitPriceCents: 2600, quantity: 2 }], {
      type: "PERCENTAGE",
      value: 10,
    });
    expect(totals).toEqual({
      subtotalCents: 5200,
      discountCents: 520,
      shippingCents: SHIPPING_FLAT_CENTS,
      taxCents: 0,
      totalCents: 5200 - 520 + SHIPPING_FLAT_CENTS,
    });
  });

  it("ships free when the discounted subtotal still meets the threshold", () => {
    const totals = computeOrderTotals([{ unitPriceCents: 6000, quantity: 1 }], {
      type: "FIXED_AMOUNT",
      value: 500,
    });
    expect(totals.shippingCents).toBe(0);
    expect(totals.totalCents).toBe(5500);
  });

  it("never produces a negative total", () => {
    const totals = computeOrderTotals([{ unitPriceCents: 300, quantity: 1 }], {
      type: "FIXED_AMOUNT",
      value: 1000,
    });
    expect(totals.discountCents).toBe(300);
    expect(totals.totalCents).toBe(SHIPPING_FLAT_CENTS);
  });

  it("returns zeros for an empty cart", () => {
    expect(computeOrderTotals([])).toEqual({
      subtotalCents: 0,
      discountCents: 0,
      shippingCents: 0,
      taxCents: 0,
      totalCents: 0,
    });
  });
});
