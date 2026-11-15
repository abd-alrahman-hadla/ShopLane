import { beforeEach, describe, expect, it } from "vitest";
import { createUser, createVariant, resetDatabase, testDb } from "@/test/db";
import { getWishlistProductIds, getWishlistProducts, setWishlisted } from "./wishlist";

beforeEach(async () => {
  await resetDatabase();
});

describe("wishlist", () => {
  it("adds and removes idempotently", async () => {
    const { productId } = await createVariant({ stock: 5 });
    const user = await createUser();

    expect(await setWishlisted(testDb, user.id, productId, true)).toEqual({
      ok: true,
      wishlisted: true,
    });
    expect(await setWishlisted(testDb, user.id, productId, true)).toEqual({
      ok: true,
      wishlisted: true,
    });
    expect(await testDb.wishlistItem.count()).toBe(1);

    expect(await setWishlisted(testDb, user.id, productId, false)).toEqual({
      ok: true,
      wishlisted: false,
    });
    expect(await setWishlisted(testDb, user.id, productId, false)).toEqual({
      ok: true,
      wishlisted: false,
    });
    expect(await testDb.wishlistItem.count()).toBe(0);
  });

  it("refuses draft products and hides products that stop being active", async () => {
    const draft = await createVariant({ stock: 5, status: "DRAFT" });
    const active = await createVariant({ stock: 5 });
    const user = await createUser();

    expect(await setWishlisted(testDb, user.id, draft.productId, true)).toEqual({
      ok: false,
      error: "product_not_found",
    });

    await setWishlisted(testDb, user.id, active.productId, true);
    expect(await getWishlistProductIds(testDb, user.id)).toEqual([active.productId]);
    expect((await getWishlistProducts(testDb, user.id)).map((p) => p.id)).toEqual([
      active.productId,
    ]);

    await testDb.product.update({ where: { id: active.productId }, data: { status: "ARCHIVED" } });
    expect(await getWishlistProductIds(testDb, user.id)).toEqual([]);
  });

  it("keeps wishlists separate per user and cleans up deleted products", async () => {
    const { productId } = await createVariant({ stock: 5 });
    const [a, b] = await Promise.all([createUser(), createUser()]);
    await setWishlisted(testDb, a.id, productId, true);
    expect(await getWishlistProductIds(testDb, b.id)).toEqual([]);

    await testDb.variant.deleteMany({ where: { productId } });
    await testDb.product.delete({ where: { id: productId } });
    expect(await testDb.wishlistItem.count()).toBe(0);
  });
});
