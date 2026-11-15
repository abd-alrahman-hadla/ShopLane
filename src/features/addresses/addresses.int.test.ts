import { beforeEach, describe, expect, it } from "vitest";
import { createUser, resetDatabase, testDb } from "@/test/db";
import {
  createAddress,
  deleteAddress,
  listAddresses,
  setDefaultAddress,
  updateAddress,
} from "./addresses";
import { MAX_ADDRESSES, type AddressInput } from "./schemas";

const input = (n: number): AddressInput => ({
  fullName: `Jamie ${n}`,
  line1: `${n} Roast Street`,
  line2: null,
  city: "Portland",
  region: "OR",
  postalCode: "97205",
  phone: null,
});

beforeEach(async () => {
  await resetDatabase();
});

async function defaults(userId: string): Promise<string[]> {
  const rows = await testDb.address.findMany({
    where: { userId, isDefault: true },
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

describe("addresses", () => {
  it("makes the first address the default", async () => {
    const user = await createUser();
    const first = await createAddress(testDb, user.id, input(1));
    await createAddress(testDb, user.id, input(2));
    expect(first.ok && (await defaults(user.id))).toEqual([first.ok ? first.id : ""]);
  });

  it(`caps addresses at ${MAX_ADDRESSES}`, async () => {
    const user = await createUser();
    for (let i = 0; i < MAX_ADDRESSES; i += 1) await createAddress(testDb, user.id, input(i));
    expect(await createAddress(testDb, user.id, input(99))).toEqual({
      ok: false,
      error: "limit_reached",
    });
    expect(await testDb.address.count({ where: { userId: user.id } })).toBe(MAX_ADDRESSES);
  });

  it("keeps exactly one default when switching", async () => {
    const user = await createUser();
    await createAddress(testDb, user.id, input(1));
    const second = await createAddress(testDb, user.id, input(2));
    if (!second.ok) throw new Error("setup failed");

    await setDefaultAddress(testDb, user.id, second.id);
    expect(await defaults(user.id)).toEqual([second.id]);
    expect((await listAddresses(testDb, user.id))[0]?.id).toBe(second.id);
  });

  it("promotes another address when the default is deleted", async () => {
    const user = await createUser();
    const first = await createAddress(testDb, user.id, input(1));
    const second = await createAddress(testDb, user.id, input(2));
    if (!first.ok || !second.ok) throw new Error("setup failed");

    await deleteAddress(testDb, user.id, first.id);
    expect(await defaults(user.id)).toEqual([second.id]);
  });

  it("cannot touch another user's address", async () => {
    const [owner, intruder] = await Promise.all([createUser(), createUser()]);
    const address = await createAddress(testDb, owner.id, input(1));
    if (!address.ok) throw new Error("setup failed");

    expect(await updateAddress(testDb, intruder.id, address.id, input(2))).toEqual({
      ok: false,
      error: "not_found",
    });
    expect(await deleteAddress(testDb, intruder.id, address.id)).toEqual({
      ok: false,
      error: "not_found",
    });
    expect(await setDefaultAddress(testDb, intruder.id, address.id)).toEqual({
      ok: false,
      error: "not_found",
    });
    expect((await testDb.address.findUniqueOrThrow({ where: { id: address.id } })).fullName).toBe(
      "Jamie 1",
    );
  });
});
