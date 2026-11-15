import type { PrismaClient } from "@/generated/prisma/client";
import {
  PURCHASED_STATUSES,
  customerOwnershipWhere,
  type CustomerIdentity,
} from "@/features/account/orders";
import type { DbClient } from "@/features/cart/quote";
import type { ReviewInput } from "./schemas";

/**
 * A verified buyer has a paid (not refunded or cancelled) order containing any
 * variant of the product, placed while signed in or as a guest with their email.
 */
export async function isVerifiedBuyer(
  db: DbClient,
  user: CustomerIdentity,
  productId: string,
): Promise<boolean> {
  const item = await db.orderItem.findFirst({
    where: {
      variant: { productId },
      order: { AND: [customerOwnershipWhere(user), { status: { in: [...PURCHASED_STATUSES] } }] },
    },
    select: { id: true },
  });
  return item !== null;
}

/** Recomputes the denormalized rating on Product from its reviews. */
export async function syncProductRating(
  db: DbClient,
  productId: string,
): Promise<{ sum: number; count: number }> {
  const aggregate = await db.review.aggregate({
    where: { productId },
    _count: { _all: true },
    _sum: { rating: true },
  });
  const count = aggregate._count._all;
  const sum = aggregate._sum.rating ?? 0;
  await db.product.update({
    where: { id: productId },
    data: { ratingCount: count, ratingSum: sum },
  });
  return { sum, count };
}

export type UpsertReviewResult =
  | { ok: true; productSlug: string; created: boolean }
  | { ok: false; error: "product_not_found" | "not_verified" };

/** Creates or updates the user's review, enforcing verified-buyer status server-side. */
export async function upsertReview(
  db: PrismaClient,
  user: CustomerIdentity,
  input: ReviewInput,
): Promise<UpsertReviewResult> {
  return db.$transaction(async (tx) => {
    const product = await tx.product.findFirst({
      where: { id: input.productId, status: "ACTIVE" },
      select: { id: true, slug: true },
    });
    if (!product) return { ok: false, error: "product_not_found" };
    if (!(await isVerifiedBuyer(tx, user, product.id))) return { ok: false, error: "not_verified" };

    const existing = await tx.review.findUnique({
      where: { productId_userId: { productId: product.id, userId: user.id } },
      select: { id: true },
    });
    await tx.review.upsert({
      where: { productId_userId: { productId: product.id, userId: user.id } },
      create: { productId: product.id, userId: user.id, rating: input.rating, body: input.body },
      update: { rating: input.rating, body: input.body },
    });
    await syncProductRating(tx, product.id);
    return { ok: true, productSlug: product.slug, created: existing === null };
  });
}

/** Deletes the caller's own review. Returns the product slug, or null if there was none. */
export async function deleteReview(
  db: PrismaClient,
  user: CustomerIdentity,
  productId: string,
): Promise<string | null> {
  return db.$transaction(async (tx) => {
    const deleted = await tx.review.deleteMany({ where: { productId, userId: user.id } });
    if (deleted.count === 0) return null;
    await syncProductRating(tx, productId);
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { slug: true },
    });
    return product?.slug ?? null;
  });
}

export type ReviewState = {
  canReview: boolean;
  existing: { rating: number; body: string } | null;
};

/** What the review form should offer this user for this product. */
export async function getReviewState(
  db: DbClient,
  user: CustomerIdentity,
  productId: string,
): Promise<ReviewState> {
  const [verified, existing] = await Promise.all([
    isVerifiedBuyer(db, user, productId),
    db.review.findUnique({
      where: { productId_userId: { productId, userId: user.id } },
      select: { rating: true, body: true },
    }),
  ]);
  return { canReview: verified, existing };
}
