import type { PrismaClient } from "@/generated/prisma/client";
import type { DbClient } from "@/features/cart/quote";
import { MAX_ADDRESSES, type AddressInput } from "./schemas";

export type AddressResult =
  { ok: true; id: string } | { ok: false; error: "not_found" | "limit_reached" };

export async function listAddresses(db: DbClient, userId: string) {
  return db.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}

/** Adds an address; the first one becomes the default. */
export async function createAddress(
  db: PrismaClient,
  userId: string,
  input: AddressInput,
): Promise<AddressResult> {
  return db.$transaction(async (tx) => {
    const count = await tx.address.count({ where: { userId } });
    if (count >= MAX_ADDRESSES) return { ok: false, error: "limit_reached" };
    const address = await tx.address.create({
      data: { ...input, country: "US", userId, isDefault: count === 0 },
      select: { id: true },
    });
    return { ok: true, id: address.id };
  });
}

/** Updates one of the user's addresses (scoped by userId, so others' are untouchable). */
export async function updateAddress(
  db: DbClient,
  userId: string,
  addressId: string,
  input: AddressInput,
): Promise<AddressResult> {
  const result = await db.address.updateMany({ where: { id: addressId, userId }, data: input });
  return result.count === 1 ? { ok: true, id: addressId } : { ok: false, error: "not_found" };
}

/** Deletes an address; if it was the default, the most recent remaining one takes over. */
export async function deleteAddress(
  db: PrismaClient,
  userId: string,
  addressId: string,
): Promise<AddressResult> {
  return db.$transaction(async (tx) => {
    const address = await tx.address.findFirst({
      where: { id: addressId, userId },
      select: { isDefault: true },
    });
    if (!address) return { ok: false, error: "not_found" };
    await tx.address.delete({ where: { id: addressId } });
    if (address.isDefault) {
      const next = await tx.address.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
    return { ok: true, id: addressId };
  });
}

/** Makes one address the default and clears the flag on the others, atomically. */
export async function setDefaultAddress(
  db: PrismaClient,
  userId: string,
  addressId: string,
): Promise<AddressResult> {
  return db.$transaction(async (tx) => {
    const exists = await tx.address.findFirst({
      where: { id: addressId, userId },
      select: { id: true },
    });
    if (!exists) return { ok: false, error: "not_found" };
    await tx.address.updateMany({
      where: { userId, NOT: { id: addressId } },
      data: { isDefault: false },
    });
    await tx.address.update({ where: { id: addressId }, data: { isDefault: true } });
    return { ok: true, id: addressId };
  });
}
