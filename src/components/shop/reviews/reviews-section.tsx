import type { ProductDetail } from "@/features/catalog/types";
import { getReviewOverview } from "@/features/reviews/queries";
import { ReviewForm } from "./review-form";
import { ReviewList } from "./review-list";
import { Stars } from "./stars";

/** Server-rendered (static via ISR); purged with the product's cache tag on new reviews. */
export async function ReviewsSection({ product }: { product: ProductDetail }) {
  const overview = await getReviewOverview(product.id, product.slug);
  const total = product.rating?.count ?? 0;

  return (
    <section
      id="reviews"
      aria-labelledby="reviews-heading"
      className="mt-12 grid max-w-5xl gap-10 border-t pt-8 lg:grid-cols-[18rem_1fr]"
    >
      <div className="flex flex-col gap-4">
        <h2 id="reviews-heading" className="text-lg font-semibold">
          Customer reviews
        </h2>
        {product.rating ? (
          <div className="flex flex-col gap-1" data-testid="review-summary">
            <div className="flex items-center gap-2">
              <Stars rating={product.rating.average} size="size-5" />
              <span className="text-lg font-semibold tabular-nums">
                {product.rating.average.toFixed(1)}
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              Based on {total} review{total === 1 ? "" : "s"}
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No reviews yet.</p>
        )}
        {total > 0 && (
          <dl className="flex flex-col gap-1.5 text-sm">
            {overview.distribution.map(({ rating, count }) => (
              <div key={rating} className="flex items-center gap-2">
                <dt className="w-12 tabular-nums">{rating} star</dt>
                <dd className="flex flex-1 items-center gap-2">
                  <span className="bg-muted h-2 flex-1 overflow-hidden rounded-full" aria-hidden>
                    <span
                      className="block h-full bg-amber-500"
                      style={{ width: `${(count / total) * 100}%` }}
                    />
                  </span>
                  <span className="text-muted-foreground w-6 text-right tabular-nums">{count}</span>
                </dd>
              </div>
            ))}
          </dl>
        )}
        <ReviewForm productId={product.id} productName={product.name} />
      </div>
      <div>
        {overview.reviews.length > 0 ? (
          <ReviewList
            productId={product.id}
            initialReviews={overview.reviews}
            initialCursor={overview.nextCursor}
          />
        ) : (
          <p className="text-muted-foreground text-sm">Be the first to review this product.</p>
        )}
      </div>
    </section>
  );
}
