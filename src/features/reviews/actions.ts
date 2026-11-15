"use server";

import { z } from "zod";
import { revalidateCatalog } from "@/features/catalog/cache";
import { getSessionUser } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { loadReviewPage, type ReviewPage } from "./queries";
import { deleteReview, getReviewState, upsertReview, type ReviewState } from "./reviews";
import { productIdSchema, reviewInputSchema } from "./schemas";

export type ReviewActionResult =
  | { ok: true; created?: boolean }
  | { ok: false; error: string; fieldErrors?: Partial<Record<"rating" | "body", string>> };

const NOT_VERIFIED = "Only customers who bought this product can review it.";

/** For the review form: is this user allowed to review, and their existing review. */
export async function getMyReviewState(productId: unknown): Promise<ReviewState | null> {
  const user = await getSessionUser();
  const parsed = productIdSchema.safeParse(productId);
  if (!user || !parsed.success) return null;
  return getReviewState(db, user, parsed.data);
}

export async function submitReview(input: unknown): Promise<ReviewActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in to write a review." };

  const parsed = reviewInputSchema.safeParse(input);
  if (!parsed.success) {
    const fields = z.flattenError(parsed.error).fieldErrors;
    return {
      ok: false,
      error: "Please check your review.",
      fieldErrors: {
        rating: fields.rating?.[0] && "Choose a rating from 1 to 5 stars.",
        body: fields.body?.[0],
      },
    };
  }

  const result = await upsertReview(db, user, parsed.data);
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.error === "not_verified" ? NOT_VERIFIED : "This product is no longer available.",
    };
  }
  revalidateCatalog({ productSlugs: [result.productSlug] });
  return { ok: true, created: result.created };
}

export async function deleteMyReview(productId: unknown): Promise<ReviewActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in." };
  const parsed = productIdSchema.safeParse(productId);
  if (!parsed.success) return { ok: false, error: "Invalid product." };

  const slug = await deleteReview(db, user, parsed.data);
  if (!slug) return { ok: false, error: "You haven’t reviewed this product." };
  revalidateCatalog({ productSlugs: [slug] });
  return { ok: true };
}

/** Public: the next page of reviews for "Show more". */
export async function loadMoreReviews(
  productId: unknown,
  cursor: unknown,
): Promise<ReviewPage | null> {
  const parsedId = productIdSchema.safeParse(productId);
  const parsedCursor = productIdSchema.safeParse(cursor);
  if (!parsedId.success || !parsedCursor.success) return null;
  return loadReviewPage(parsedId.data, parsedCursor.data);
}
