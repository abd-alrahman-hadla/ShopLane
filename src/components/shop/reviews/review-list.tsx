"use client";

import { useState, useTransition } from "react";
import { BadgeCheckIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { loadMoreReviews } from "@/features/reviews/actions";
import type { PublicReview } from "@/features/reviews/queries";
import type { Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/format";
import { Stars } from "./stars";

function ReviewItem({ review }: { review: PublicReview }) {
  const t = useTranslations("reviews");
  const locale = useLocale() as Locale;
  return (
    <li className="flex flex-col gap-2 py-5" data-testid="review">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Stars rating={review.rating} />
        <span className="text-sm font-medium">{review.authorName}</span>
        <span className="text-success inline-flex items-center gap-1 text-xs">
          <BadgeCheckIcon className="size-3.5" aria-hidden />
          {t("verifiedBuyer")}
        </span>
        <time className="text-muted-foreground text-xs" dateTime={review.createdAt}>
          {formatDate(review.createdAt, locale)}
        </time>
      </div>
      {/* Plain text: React escapes it, and line breaks are kept. */}
      <p className="text-sm leading-relaxed whitespace-pre-line">{review.body}</p>
    </li>
  );
}

type ReviewListProps = {
  productId: string;
  initialReviews: PublicReview[];
  initialCursor: string | null;
};

export function ReviewList({ productId, initialReviews, initialCursor }: ReviewListProps) {
  const [reviews, setReviews] = useState(initialReviews);
  const [cursor, setCursor] = useState(initialCursor);
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("reviews");

  function showMore(): void {
    if (!cursor) return;
    startTransition(async () => {
      const page = await loadMoreReviews(productId, cursor);
      if (!page) return;
      setReviews((current) => [
        ...current,
        ...page.reviews.filter((r) => !current.some((c) => c.id === r.id)),
      ]);
      setCursor(page.nextCursor);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="divide-y" data-testid="review-list">
        {reviews.map((review) => (
          <ReviewItem key={review.id} review={review} />
        ))}
      </ul>
      {cursor && (
        <Button variant="outline" onClick={showMore} disabled={isPending} className="self-start">
          {isPending ? t("loading") : t("showMore")}
        </Button>
      )}
    </div>
  );
}
