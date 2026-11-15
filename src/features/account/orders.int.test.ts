import { beforeEach, describe, expect, it } from "vitest";
import { createUser, createVariant, resetDatabase, testDb } from "@/test/db";
import { createTestOrder } from "@/test/orders";
import { getCustomerOrder, listCustomerOrders } from "./orders";

beforeEach(async () => {
  await resetDatabase();
});

describe("customer orders", () => {
  it("lists own orders and email-matched guest orders, hiding abandoned checkouts", async () => {
    const variant = await createVariant({ stock: 50 });
    const items = [{ variantId: variant.id, quantity: 1 }];
    const me = await createUser({ email: "me@example.com" });
    const other = await createUser({ email: "other@example.com" });
    const user = { id: me.id, email: me.email };

    const mine = await createTestOrder({ items, status: "PAID", userId: me.id });
    const guest = await createTestOrder({ items, status: "SHIPPED", email: "ME@example.com" });
    const oos = await createTestOrder({
      items,
      status: "CANCELLED",
      userId: me.id,
      cancelReason: "out_of_stock",
    });
    await createTestOrder({ items, status: "PENDING", userId: me.id });
    await createTestOrder({
      items,
      status: "CANCELLED",
      userId: me.id,
      cancelReason: "checkout_expired",
    });
    await createTestOrder({ items, status: "PAID", userId: other.id });
    await createTestOrder({ items, status: "PAID", email: "other@example.com" });

    const { orders, total } = await listCustomerOrders(testDb, user, 1);

    expect(total).toBe(3);
    expect(orders.map((o) => o.id).sort()).toEqual([mine.id, guest.id, oos.id].sort());
    expect(orders.every((o) => o.itemCount === 1)).toBe(true);
  });

  it("never returns another customer's order by number", async () => {
    const variant = await createVariant({ stock: 5 });
    const me = await createUser();
    const other = await createUser();
    const theirs = await createTestOrder({
      items: [{ variantId: variant.id, quantity: 1 }],
      status: "PAID",
      userId: other.id,
    });

    expect(
      await getCustomerOrder(testDb, { id: me.id, email: me.email }, theirs.number),
    ).toBeNull();
    expect(
      await getCustomerOrder(testDb, { id: other.id, email: other.email }, theirs.number),
    ).not.toBeNull();
  });

  it("clamps the page number", async () => {
    const me = await createUser();
    const result = await listCustomerOrders(testDb, { id: me.id, email: me.email }, 99);
    expect(result).toMatchObject({ page: 1, pageCount: 1, total: 0, orders: [] });
  });
});
