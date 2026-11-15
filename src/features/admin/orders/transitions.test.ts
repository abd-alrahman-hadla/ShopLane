import { describe, expect, it } from "vitest";
import { canTransition, refundableCents, trackingUrl } from "./transitions";

const ship = {
  to: "SHIPPED" as const,
  carrier: "UPS" as const,
  trackingNumber: "1Z999AA10123456784",
};

describe("canTransition", () => {
  it("packs only paid orders", () => {
    expect(canTransition("PAID", { to: "FULFILLED" })).toEqual({ ok: true });
    for (const from of ["PENDING", "FULFILLED", "SHIPPED", "REFUNDED", "CANCELLED"] as const) {
      expect(canTransition(from, { to: "FULFILLED" }).ok, from).toBe(false);
    }
  });

  it("ships paid or packed orders, and lets shipped orders fix tracking", () => {
    for (const from of ["PAID", "FULFILLED", "SHIPPED"] as const) {
      expect(canTransition(from, ship), from).toEqual({ ok: true });
    }
    for (const from of ["PENDING", "REFUNDED", "CANCELLED"] as const) {
      expect(canTransition(from, ship).ok, from).toBe(false);
    }
  });

  it("requires a tracking number to ship", () => {
    expect(canTransition("PAID", { ...ship, trackingNumber: "   " })).toEqual({
      ok: false,
      reason: "A tracking number is required to ship.",
    });
  });
});

describe("trackingUrl", () => {
  it("links to each carrier's tracking page with an encoded number", () => {
    expect(trackingUrl("USPS", "9400 1000")).toBe(
      "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400%201000",
    );
    expect(trackingUrl("UPS", "1Z9")).toBe("https://www.ups.com/track?tracknum=1Z9");
    expect(trackingUrl("FedEx", "123")).toBe("https://www.fedex.com/fedextrack/?trknbr=123");
    expect(trackingUrl("DHL", "456")).toBe("https://www.dhl.com/en/express/tracking.html?AWB=456");
  });

  it("returns null for other carriers or missing data", () => {
    expect(trackingUrl("Other", "123")).toBeNull();
    expect(trackingUrl(null, "123")).toBeNull();
    expect(trackingUrl("UPS", null)).toBeNull();
  });
});

describe("refundableCents", () => {
  it("is what's left to refund on a paid order", () => {
    expect(refundableCents({ status: "SHIPPED", totalCents: 5000, refundedCents: 1200 })).toBe(
      3800,
    );
  });

  it("is zero for unpaid, refunded or cancelled orders", () => {
    for (const status of ["PENDING", "REFUNDED", "CANCELLED"] as const) {
      expect(refundableCents({ status, totalCents: 5000, refundedCents: 0 }), status).toBe(0);
    }
  });
});
