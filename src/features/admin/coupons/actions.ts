"use server";

import { diffFields } from "../audit";
import { AdminActionError, adminMutation } from "../mutation";
import { couponActiveSchema, couponFormSchema, couponIdSchema } from "./schemas";

const AUDITED = [
  "code",
  "type",
  "value",
  "minSubtotalCents",
  "maxRedemptions",
  "startsAt",
  "endsAt",
  "isActive",
] as const;

export const saveCoupon = adminMutation(couponFormSchema, async ({ tx, input }) => {
  const existing = input.id ? await tx.coupon.findUnique({ where: { id: input.id } }) : null;
  if (input.id && !existing) throw new AdminActionError("This coupon no longer exists.");

  const clash = await tx.coupon.findFirst({
    where: { code: input.code, ...(existing ? { NOT: { id: existing.id } } : {}) },
    select: { id: true },
  });
  if (clash) throw new AdminActionError("That code is already used.", { code: "Already used." });

  if (
    existing &&
    input.maxRedemptions !== null &&
    input.maxRedemptions < existing.redemptionCount
  ) {
    throw new AdminActionError(`It has already been redeemed ${existing.redemptionCount} times.`, {
      maxRedemptions: `At least ${existing.redemptionCount}.`,
    });
  }
  // Once redeemed, the discount terms are part of past orders; only the limits and window may change.
  if (
    existing &&
    existing.redemptionCount > 0 &&
    (existing.type !== input.type || existing.value !== input.value)
  ) {
    throw new AdminActionError(
      "This coupon has been used, so its type and value can't change. Create a new code instead.",
    );
  }

  const data = {
    code: input.code,
    type: input.type,
    value: input.value,
    minSubtotalCents: input.minSubtotalCents,
    maxRedemptions: input.maxRedemptions,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    isActive: input.isActive,
  };
  const coupon = existing
    ? await tx.coupon.update({ where: { id: existing.id }, data })
    : await tx.coupon.create({ data });

  return {
    result: { id: coupon.id },
    audit: {
      action: existing ? "coupon.update" : "coupon.create",
      entityType: "Coupon",
      entityId: coupon.id,
      summary: existing ? `Updated coupon ${coupon.code}` : `Created coupon ${coupon.code}`,
      changes: diffFields(existing, data, AUDITED),
    },
  };
});

export const setCouponActive = adminMutation(couponActiveSchema, async ({ tx, input }) => {
  const coupon = await tx.coupon.findUnique({ where: { id: input.couponId } });
  if (!coupon) throw new AdminActionError("Coupon not found.");
  await tx.coupon.update({ where: { id: coupon.id }, data: { isActive: input.isActive } });
  return {
    result: { isActive: input.isActive },
    audit: {
      action: input.isActive ? "coupon.activate" : "coupon.deactivate",
      entityType: "Coupon",
      entityId: coupon.id,
      summary: `${input.isActive ? "Activated" : "Deactivated"} coupon ${coupon.code}`,
      changes: { isActive: [coupon.isActive, input.isActive] },
    },
  };
});

/** Only never-used coupons can be deleted; used ones are deactivated to keep order history readable. */
export const deleteCoupon = adminMutation(couponIdSchema, async ({ tx, input }) => {
  const coupon = await tx.coupon.findUnique({
    where: { id: input.couponId },
    include: { _count: { select: { orders: true } } },
  });
  if (!coupon) throw new AdminActionError("Coupon not found.");
  if (coupon.redemptionCount > 0 || coupon._count.orders > 0) {
    throw new AdminActionError("This coupon has been used. Deactivate it instead.");
  }
  await tx.coupon.delete({ where: { id: coupon.id } });
  return {
    result: { deleted: true },
    audit: {
      action: "coupon.delete",
      entityType: "Coupon",
      entityId: coupon.id,
      summary: `Deleted coupon ${coupon.code}`,
      changes: { code: [coupon.code, null] },
    },
  };
});
