import { unstable_cache } from "next/cache";
import { CATALOG_TAGS } from "@/features/catalog/cache";
import { db } from "@/lib/db";
import { ratingDistribution, reviewerDisplayName } from "./rating";

export const REVIEWS_PAGE_SIZE = 10;

export type PublicReview = {
  id: string;
  rating: number;
  body: string;
  authorName: string;
  /** ISO string (the data cache serializes values as JSON). */
  createdAt: string;
};

export type ReviewPage = { reviews: PublicReview[]; nextCursor: string | null };

/** Newest first; `cursor` is the id of the last review already shown. */
export async function loadReviewPage(
  productId: string,
  cursor: string | null,
): Promise<ReviewPage> {
  const rows = await db.review.findMany({
    where: { productId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: REVIEWS_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      rating: true,
      body: true,
      createdAt: true,
      user: { select: { name: true } },
    },
  });
  const page = rows.slice(0, REVIEWS_PAGE_SIZE);
  return {
    reviews: page.map((row) => ({
      id: row.id,
      rating: row.rating,
      body: row.body,
      authorName: reviewerDisplayName(row.user.name),
      createdAt: row.createdAt.toISOString(),
    })),
    nextCursor: rows.length > REVIEWS_PAGE_SIZE ? (page.at(-1)?.id ?? null) : null,
  };
}

export type ReviewOverview = ReviewPage & {
  distribution: Array<{ rating: number; count: number }>;
};

/** First page plus the star distribution, cached with the product page's tags. */
export function getReviewOverview(productId: string, productSlug: string): Promise<ReviewOverview> {
  return unstable_cache(
    async (): Promise<ReviewOverview> => {
      const [firstPage, groups] = await Promise.all([
        loadReviewPage(productId, null),
        db.review.groupBy({ by: ["rating"], where: { productId }, _count: { _all: true } }),
      ]);
      return {
        ...firstPage,
        distribution: ratingDistribution(
          groups.map((g) => ({ rating: g.rating, count: g._count._all })),
        ),
      };
    },
    ["reviews:overview", productId],
    { tags: [CATALOG_TAGS.products, CATALOG_TAGS.product(productSlug)], revalidate: 3600 },
  )();
}
