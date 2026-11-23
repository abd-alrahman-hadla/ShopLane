import type { OrderStatus } from "@/generated/prisma/client";

export const CARRIERS = ["USPS", "UPS", "FedEx", "DHL", "Other"] as const;
export type Carrier = (typeof CARRIERS)[number];

export type StatusChange =
  { to: "FULFILLED" } | { to: "SHIPPED"; carrier: Carrier; trackingNumber: string };

export type TransitionCheck =
  | { ok: true }
  | {
      ok: false;
      /** English explanation (logs, tests); the UI translates `code`. */
      reason: string;
      code: "cantPack" | "cantShip" | "trackingRequired";
    };

/**
 * Manual status changes an admin may make:
 * PAID → FULFILLED; PAID/FULFILLED → SHIPPED; SHIPPED → SHIPPED (tracking fix).
 * Refunds and cancellations happen through the refund flow, never here.
 */
export function canTransition(from: OrderStatus, change: StatusChange): TransitionCheck {
  if (change.to === "FULFILLED") {
    return from === "PAID"
      ? { ok: true }
      : {
          ok: false,
          reason: `A ${from.toLowerCase()} order can't be marked packed.`,
          code: "cantPack",
        };
  }
  if (!["PAID", "FULFILLED", "SHIPPED"].includes(from)) {
    return {
      ok: false,
      reason: `A ${from.toLowerCase()} order can't be shipped.`,
      code: "cantShip",
    };
  }
  if (!change.trackingNumber.trim())
    return {
      ok: false,
      reason: "A tracking number is required to ship.",
      code: "trackingRequired",
    };
  return { ok: true };
}

/** Public tracking page for a carrier, or null when there isn't a standard one. */
export function trackingUrl(carrier: string | null, trackingNumber: string | null): string | null {
  if (!carrier || !trackingNumber) return null;
  const number = encodeURIComponent(trackingNumber.trim());
  switch (carrier) {
    case "USPS":
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${number}`;
    case "UPS":
      return `https://www.ups.com/track?tracknum=${number}`;
    case "FedEx":
      return `https://www.fedex.com/fedextrack/?trknbr=${number}`;
    case "DHL":
      return `https://www.dhl.com/en/express/tracking.html?AWB=${number}`;
    default:
      return null;
  }
}

/** Refund statuses: only paid orders that haven't been fully refunded can be refunded. */
export function refundableCents(order: {
  status: OrderStatus;
  totalCents: number;
  refundedCents: number;
}): number {
  if (!["PAID", "FULFILLED", "SHIPPED"].includes(order.status)) return 0;
  return Math.max(0, order.totalCents - order.refundedCents);
}
