import { signInAs, useFakeStripe } from "@/test/admin";
import { beforeEach, describe, expect, it } from "vitest";
import { createCoupon, createUser, resetDatabase, testDb } from "@/test/db";
import { deleteCoupon, saveCoupon, setCouponActive } from "./actions";
import type { CouponFormInput } from "./schemas";

const base: CouponFormInput = {
  id: null,
  code: "spring15",
  type: "PERCENTAGE",
  value: 15,
  minSubtotalCents: 3000,
  maxRedemptions: 100,
  startsAt: "",
  endsAt: "",
  isActive: true,
};

beforeEach(async () => {
  await resetDatabase();
  useFakeStripe();
  const admin = await createUser({ email: "admin@example.com" });
  await testDb.user.update({ where: { id: admin.id }, data: { role: "ADMIN" } });
  signInAs({ id: admin.id, email: admin.email, role: "ADMIN" });
});

describe("coupons", () => {
  it("creates, updates and toggles a coupon, auditing each change", async () => {
    const created = await saveCoupon(base);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(await testDb.coupon.findUniqueOrThrow({ where: { id: created.data.id } })).toMatchObject(
      {
        code: "SPRING15",
        value: 15,
        minSubtotalCents: 3000,
      },
    );

    await saveCoupon({
      ...base,
      id: created.data.id,
      maxRedemptions: 50,
      endsAt: "2026-12-31T23:59:00.000Z",
    });
    await setCouponActive({ couponId: created.data.id, isActive: false });

    const logs = await testDb.auditLog.findMany({ orderBy: { createdAt: "asc" } });
    expect(logs.map((l) => l.action)).toEqual([
      "coupon.create",
      "coupon.update",
      "coupon.deactivate",
    ]);
    expect(logs[1]?.changes).toEqual({
      maxRedemptions: [100, 50],
      endsAt: [null, "2026-12-31T23:59:00.000Z"],
    });
  });

  it("keeps codes unique", async () => {
    await saveCoupon(base);
    expect(await saveCoupon({ ...base, code: "SPRING15" })).toMatchObject({
      ok: false,
      fieldErrors: { code: expect.any(String) },
    });
  });

  it("locks the discount terms once a coupon has been redeemed", async () => {
    const coupon = await createCoupon({ code: "USED10", value: 10, redemptionCount: 3 });
    const edit = { ...base, id: coupon.id, code: "USED10", value: 10, maxRedemptions: null };

    expect(await saveCoupon({ ...edit, value: 50 })).toMatchObject({ ok: false });
    expect(await saveCoupon({ ...edit, maxRedemptions: 2 })).toMatchObject({
      ok: false,
      fieldErrors: { maxRedemptions: expect.any(String) },
    });
    expect(await saveCoupon({ ...edit, maxRedemptions: 10 })).toMatchObject({ ok: true });
  });

  it("only deletes coupons that were never used", async () => {
    const used = await createCoupon({ code: "USED", redemptionCount: 1 });
    const unused = await createCoupon({ code: "UNUSED" });

    expect(await deleteCoupon({ couponId: used.id })).toMatchObject({
      ok: false,
      error: expect.stringContaining("Deactivate"),
    });
    expect(await deleteCoupon({ couponId: unused.id })).toMatchObject({ ok: true });
    expect(await testDb.coupon.count()).toBe(1);
    expect((await testDb.auditLog.findFirstOrThrow()).action).toBe("coupon.delete");
  });
});
