import { getLocale, getTranslations } from "next-intl/server";
import type { ProductDetail } from "@/features/catalog/types";
import { getReviewOverview } from "@/features/reviews/queries";
import type { Locale } from "@/i18n/routing";
import { formatNumber } from "@/lib/format";
import { ReviewForm } from "./review-form";
import { ReviewList } from "./review-list";
import { Stars } from "./stars";

/** Server-rendered (static via ISR); purged with the product's cache tag on new reviews. */
export async function ReviewsSection({ product }: { product: ProductDetail }) {
  const [overview, t, locale] = await Promise.all([
    getReviewOverview(product.id, product.slug),
    getTranslations("reviews"),
    getLocale() as Promise<Locale>,
  ]);
  const total = product.rating?.count ?? 0;

  return (
    <section
      id="reviews"
      aria-labelledby="reviews-heading"
      className="mt-12 grid max-w-5xl gap-10 border-t pt-8 lg:grid-cols-[18rem_1fr]"
    >
      <div className="flex flex-col gap-4">
        <h2 id="reviews-heading" className="text-lg font-semibold">
          {t("heading")}
        </h2>
        {product.rating ? (
          <div className="flex flex-col gap-1" data-testid="review-summary">
            <div className="flex items-center gap-2">
              <Stars rating={product.rating.average} size="size-5" />
              <span className="text-lg font-semibold tabular-nums">
                {product.rating.average.toFixed(1)}
              </span>
            </div>
            <p className="text-muted-foreground text-sm">{t("basedOn", { count: total })}</p>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">{t("none")}</p>
        )}
        {total > 0 && (
          <dl className="flex flex-col gap-1.5 text-sm">
            {overview.distribution.map(({ rating, count }) => (
              <div key={rating} className="flex items-center gap-2">
                <dt className="w-14 tabular-nums">{t("starRow", { rating })}</dt>
                <dd className="flex flex-1 items-center gap-2">
                  <span className="bg-muted h-2 flex-1 overflow-hidden rounded-full" aria-hidden>
                    <span
                      className="block h-full bg-amber-500"
                      style={{ width: `${(count / total) * 100}%` }}
                    />
                  </span>
                  <span className="text-muted-foreground w-6 text-end tabular-nums">
                    {formatNumber(count, locale)}
                  </span>
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
          <p className="text-muted-foreground text-sm">{t("beFirst")}</p>
        )}
      </div>
    </section>
  );
}
