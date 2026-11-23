import { StarHalfIcon, StarIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { formatNumber } from "@/lib/format";
import { starFill } from "@/features/reviews/rating";
import { cn } from "@/lib/utils";

type StarsProps = {
  rating: number;
  className?: string;
  /** Size class for each star, e.g. "size-4". */
  size?: string;
};

/** Read-only star display, rounded to the nearest half star. */
export function Stars({ rating, className, size = "size-4" }: StarsProps) {
  const t = useTranslations("reviews");
  return (
    <span
      role="img"
      aria-label={t("starsLabel", { rating })}
      // Stars fill left to right in every language.
      dir="ltr"
      className={cn("inline-flex items-center gap-0.5 text-amber-500", className)}
    >
      {starFill(rating).map((fill, index) => (
        <span key={index} className={cn("relative inline-block", size)} aria-hidden>
          <StarIcon className={cn("absolute inset-0 text-amber-500/30", size)} />
          {fill === "full" && <StarIcon className={cn("absolute inset-0 fill-current", size)} />}
          {fill === "half" && (
            <StarHalfIcon className={cn("absolute inset-0 fill-current", size)} />
          )}
        </span>
      ))}
    </span>
  );
}

/** "★★★★½ 4.6 (12)". Renders nothing without reviews. */
export function RatingSummary({
  rating,
  className,
}: {
  rating: { average: number; count: number } | null;
  className?: string;
}) {
  const t = useTranslations("reviews");
  const locale = useLocale() as Locale;
  if (!rating) return null;
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs", className)}
      data-testid="rating-summary"
    >
      <Stars rating={rating.average} size="size-3.5" />
      <span className="text-muted-foreground tabular-nums">
        {rating.average.toFixed(1)}{" "}
        <span aria-label={t("reviewCount", { count: rating.count })}>
          ({formatNumber(rating.count, locale)})
        </span>
      </span>
    </span>
  );
}
