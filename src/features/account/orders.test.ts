import { describe, expect, it } from "vitest";
import {
  customerOwnershipWhere,
  orderStatusInfo,
  parseOrderNumber,
  visibleOrderWhere,
} from "./orders";

const user = { id: "u1", email: "jamie@example.com" };

describe("customerOwnershipWhere", () => {
  it("matches signed-in orders and guest orders with the same email", () => {
    expect(customerOwnershipWhere(user)).toEqual({
      OR: [
        { userId: "u1" },
        { userId: null, email: { equals: "jamie@example.com", mode: "insensitive" } },
      ],
    });
  });

  it("does not claim another account's orders by email", () => {
    // Only guest orders (userId null) are matched by email.
    const guestClause = customerOwnershipWhere(user).OR?.[1];
    expect(guestClause).toMatchObject({ userId: null });
  });
});

describe("visibleOrderWhere", () => {
  it("shows purchased, refunded and out-of-stock orders only", () => {
    const where = visibleOrderWhere(user);
    expect(where.AND).toContainEqual({
      OR: [
        { status: { in: ["PAID", "FULFILLED", "SHIPPED", "REFUNDED"] } },
        { status: "CANCELLED", cancelReason: "out_of_stock" },
      ],
    });
    expect(JSON.stringify(where)).not.toContain("PENDING");
  });
});

describe("parseOrderNumber", () => {
  it("parses formatted order numbers", () => {
    expect(parseOrderNumber("SL-0007")).toBe(7);
    expect(parseOrderNumber("sl-1234")).toBe(1234);
  });

  it("rejects anything else", () => {
    expect(parseOrderNumber("7")).toBeNull();
    expect(parseOrderNumber("SL-")).toBeNull();
    expect(parseOrderNumber("SL-0000")).toBeNull();
    expect(parseOrderNumber("SL-12abc")).toBeNull();
    expect(parseOrderNumber("SL-99999999999")).toBeNull();
  });
});

describe("orderStatusInfo", () => {
  it("tracks progress through fulfilment", () => {
    expect(orderStatusInfo("PAID", null)).toMatchObject({ label: "Paid", step: 1 });
    expect(orderStatusInfo("FULFILLED", null)).toMatchObject({ label: "Packed", step: 2 });
    expect(orderStatusInfo("SHIPPED", null)).toMatchObject({
      label: "Shipped",
      step: 3,
      tone: "success",
    });
  });

  it("explains out-of-stock cancellations", () => {
    expect(orderStatusInfo("CANCELLED", "out_of_stock").description).toContain("sold out");
    expect(orderStatusInfo("CANCELLED", "checkout_expired").description).toBe(
      "This order was cancelled.",
    );
  });

  it("labels refunds", () => {
    expect(orderStatusInfo("REFUNDED", null)).toMatchObject({ label: "Refunded", step: 0 });
  });
});
