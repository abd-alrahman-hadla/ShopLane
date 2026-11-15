import { describe, expect, it } from "vitest";
import {
  bucketRevenueByDay,
  dayKey,
  netRevenueCents,
  relativeChange,
  revenueWindows,
  shiftDayKey,
  type PaidOrder,
} from "./metrics";

const TZ = "America/New_York";
// 2026-11-15 15:00 in New York (EST, UTC-5).
const now = new Date("2026-11-15T20:00:00Z");

function order(paidAt: string, totalCents: number, refundedCents = 0): PaidOrder {
  return { paidAt: new Date(paidAt), totalCents, refundedCents };
}

describe("day keys", () => {
  it("uses the store's calendar day, not UTC", () => {
    // 03:30 UTC on the 16th is still the evening of the 15th in New York.
    expect(dayKey(new Date("2026-11-16T03:30:00Z"), TZ)).toBe("2026-11-15");
    expect(dayKey(new Date("2026-11-16T05:30:00Z"), TZ)).toBe("2026-11-16");
  });

  it("shifts across month, year and DST boundaries by calendar days", () => {
    expect(shiftDayKey("2026-11-01", -1)).toBe("2026-10-31");
    expect(shiftDayKey("2026-01-01", -1)).toBe("2025-12-31");
    expect(shiftDayKey("2026-03-08", 1)).toBe("2026-03-09"); // US DST starts on 2026-03-08
  });
});

describe("netRevenueCents", () => {
  it("subtracts refunds and never goes negative", () => {
    expect(netRevenueCents({ totalCents: 5000, refundedCents: 1200 })).toBe(3800);
    expect(netRevenueCents({ totalCents: 5000, refundedCents: 9000 })).toBe(0);
  });
});

describe("revenueWindows", () => {
  const orders = [
    order("2026-11-15T14:00:00Z", 4000), // today
    order("2026-11-16T03:00:00Z", 2000), // today in New York (22:00 local)
    order("2026-11-15T04:00:00Z", 1000), // yesterday in New York (23:00 on the 14th)
    order("2026-11-09T15:00:00Z", 3000, 3000), // 6 days ago, fully refunded
    order("2026-11-08T15:00:00Z", 5000), // 7 days ago: previous 7-day window
    order("2026-10-17T15:00:00Z", 6000), // 29 days ago: inside 30 days
    order("2026-10-16T15:00:00Z", 7000), // 30 days ago: previous 30-day window
  ];
  const windows = revenueWindows(orders, { now, timeZone: TZ });

  it("counts today in the store's time zone", () => {
    expect(windows.today).toEqual({ revenueCents: 6000, orders: 2, aovCents: 3000 });
  });

  it("nets refunds out of revenue but still counts the order", () => {
    expect(windows.last7).toMatchObject({ revenueCents: 7000, orders: 4, aovCents: 1750 });
  });

  it("compares with the equal-length period before", () => {
    expect(windows.last7.previous).toEqual({ revenueCents: 5000, orders: 1, aovCents: 5000 });
    expect(windows.last30).toMatchObject({ revenueCents: 18000, orders: 6 });
    expect(windows.last30.previous).toMatchObject({ revenueCents: 7000, orders: 1 });
  });

  it("reports zero AOV with no orders", () => {
    expect(revenueWindows([], { now, timeZone: TZ }).today).toEqual({
      revenueCents: 0,
      orders: 0,
      aovCents: 0,
    });
  });
});

describe("bucketRevenueByDay", () => {
  it("returns every day oldest first, filling gaps with zero", () => {
    const days = bucketRevenueByDay(
      [order("2026-11-15T14:00:00Z", 4000), order("2026-11-13T14:00:00Z", 1500, 500)],
      { now, timeZone: TZ, days: 3 },
    );
    expect(days).toEqual([
      { date: "2026-11-13", revenueCents: 1000, orders: 1 },
      { date: "2026-11-14", revenueCents: 0, orders: 0 },
      { date: "2026-11-15", revenueCents: 4000, orders: 1 },
    ]);
  });

  it("ignores orders outside the range", () => {
    const days = bucketRevenueByDay([order("2026-10-01T14:00:00Z", 9999)], {
      now,
      timeZone: TZ,
      days: 30,
    });
    expect(days).toHaveLength(30);
    expect(days.every((d) => d.revenueCents === 0)).toBe(true);
  });
});

describe("relativeChange", () => {
  it("is a signed fraction, or null without a baseline", () => {
    expect(relativeChange(150, 100)).toBe(0.5);
    expect(relativeChange(50, 100)).toBe(-0.5);
    expect(relativeChange(10, 0)).toBeNull();
  });
});
