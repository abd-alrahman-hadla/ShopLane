import { beforeEach, describe, expect, it } from "vitest";
import { createUser, createVariant, resetDatabase, testDb } from "@/test/db";
import { createTestOrder } from "@/test/orders";
import { deleteReview, getReviewState, isVerifiedBuyer, upsertReview } from "./reviews";

beforeEach(async () => {
  await resetDatabase();
});

async function productRating(productId: string) {
  return testDb.product.findUniqueOrThrow({
    where: { id: productId },
    select: { ratingCount: true, ratingSum: true },
  });
}

async function setup() {
  const variant = await createVariant({ stock: 10 });
  const user = await createUser({ email: "buyer@example.com", name: "Jamie Rivera" });
  return { variant, productId: variant.productId, user: { id: user.id, email: user.email } };
}

describe("verified buyers", () => {
  it("rejects users who have not bought the product", async () => {
    const { productId, user } = await setup();
    const result = await upsertReview(testDb, user, {
      productId,
      rating: 5,
      body: "Great coffee, would buy.",
    });
    expect(result).toEqual({ ok: false, error: "not_verified" });
    expect(await testDb.review.count()).toBe(0);
  });

  it("accepts buyers with a paid, packed or shipped order", async () => {
    for (const status of ["PAID", "FULFILLED", "SHIPPED"] as const) {
      await resetDatabase();
      const { variant, productId, user } = await setup();
      await createTestOrder({
        items: [{ variantId: variant.id, quantity: 1 }],
        status,
        userId: user.id,
      });
      expect(await isVerifiedBuyer(testDb, user, productId), status).toBe(true);
    }
  });

  it("does not count refunded, cancelled or unpaid orders", async () => {
    for (const status of ["REFUNDED", "CANCELLED", "PENDING"] as const) {
      await resetDatabase();
      const { variant, productId, user } = await setup();
      await createTestOrder({
        items: [{ variantId: variant.id, quantity: 1 }],
        status,
        userId: user.id,
      });
      expect(await isVerifiedBuyer(testDb, user, productId), status).toBe(false);
    }
  });

  it("counts a guest order placed with the same email (any case)", async () => {
    const { variant, productId, user } = await setup();
    await createTestOrder({
      items: [{ variantId: variant.id, quantity: 1 }],
      status: "PAID",
      email: "Buyer@Example.com",
    });
    expect(await isVerifiedBuyer(testDb, user, productId)).toBe(true);
  });

  it("does not count another account's order with the same email", async () => {
    const { variant, productId, user } = await setup();
    const other = await createUser({ email: "someone@example.com" });
    await createTestOrder({
      items: [{ variantId: variant.id, quantity: 1 }],
      status: "PAID",
      userId: other.id,
      email: user.email,
    });
    expect(await isVerifiedBuyer(testDb, user, productId)).toBe(false);
  });
});

describe("upsertReview", () => {
  it("creates once and then updates the same review", async () => {
    const { variant, productId, user } = await setup();
    await createTestOrder({
      items: [{ variantId: variant.id, quantity: 1 }],
      status: "PAID",
      userId: user.id,
    });

    const first = await upsertReview(testDb, user, {
      productId,
      rating: 4,
      body: "Sweet and balanced.",
    });
    const second = await upsertReview(testDb, user, {
      productId,
      rating: 2,
      body: "Changed my mind, too bitter.",
    });

    expect(first).toMatchObject({ ok: true, created: true });
    expect(second).toMatchObject({ ok: true, created: false });
    expect(await testDb.review.count()).toBe(1);
    expect(await productRating(productId)).toEqual({ ratingCount: 1, ratingSum: 2 });
  });

  it("keeps product aggregates correct across users, updates and deletes", async () => {
    const { variant, productId } = await setup();
    const buyers = await Promise.all([createUser(), createUser(), createUser()]);
    for (const buyer of buyers) {
      await createTestOrder({
        items: [{ variantId: variant.id, quantity: 1 }],
        status: "PAID",
        userId: buyer.id,
      });
    }
    const [a, b, c] = buyers.map((buyer) => ({ id: buyer.id, email: buyer.email }));
    await upsertReview(testDb, a!, { productId, rating: 5, body: "Excellent all round." });
    await upsertReview(testDb, b!, { productId, rating: 4, body: "Very good, a bit pricey." });
    await upsertReview(testDb, c!, { productId, rating: 3, body: "Fine, nothing special." });
    expect(await productRating(productId)).toEqual({ ratingCount: 3, ratingSum: 12 });

    await upsertReview(testDb, c!, { productId, rating: 1, body: "Arrived damaged this time." });
    expect(await productRating(productId)).toEqual({ ratingCount: 3, ratingSum: 10 });

    await deleteReview(testDb, a!, productId);
    expect(await productRating(productId)).toEqual({ ratingCount: 2, ratingSum: 5 });
  });

  it("refuses reviews on products that are no longer active", async () => {
    const variant = await createVariant({ stock: 1, status: "DRAFT" });
    const user = await createUser();
    const result = await upsertReview(
      testDb,
      { id: user.id, email: user.email },
      {
        productId: variant.productId,
        rating: 5,
        body: "Should not be allowed.",
      },
    );
    expect(result).toEqual({ ok: false, error: "product_not_found" });
  });
});

describe("deleteReview", () => {
  it("only deletes the caller's own review", async () => {
    const { variant, productId, user } = await setup();
    await createTestOrder({
      items: [{ variantId: variant.id, quantity: 1 }],
      status: "PAID",
      userId: user.id,
    });
    await upsertReview(testDb, user, { productId, rating: 5, body: "Love this one a lot." });
    const intruder = await createUser();

    expect(
      await deleteReview(testDb, { id: intruder.id, email: intruder.email }, productId),
    ).toBeNull();
    expect(await testDb.review.count()).toBe(1);
    expect(await deleteReview(testDb, user, productId)).not.toBeNull();
    expect(await testDb.review.count()).toBe(0);
  });
});

describe("getReviewState", () => {
  it("reports eligibility and the existing review", async () => {
    const { variant, productId, user } = await setup();
    expect(await getReviewState(testDb, user, productId)).toEqual({
      canReview: false,
      existing: null,
    });

    await createTestOrder({
      items: [{ variantId: variant.id, quantity: 1 }],
      status: "SHIPPED",
      userId: user.id,
    });
    await upsertReview(testDb, user, { productId, rating: 4, body: "Really nice grinder." });
    expect(await getReviewState(testDb, user, productId)).toEqual({
      canReview: true,
      existing: { rating: 4, body: "Really nice grinder." },
    });
  });
});
