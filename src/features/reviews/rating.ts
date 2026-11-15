/** Pure rating helpers. Products store ratingSum/ratingCount; the average is derived. */

export const MIN_RATING = 1;
export const MAX_RATING = 5;

export type RatingSummary = { average: number; count: number };

/** Average rounded to one decimal, or null when there are no reviews. */
export function averageRating(sum: number, count: number): number | null {
  if (count <= 0) return null;
  return Math.round((sum / count) * 10) / 10;
}

export function ratingSummary(sum: number, count: number): RatingSummary | null {
  const average = averageRating(sum, count);
  return average === null ? null : { average, count };
}

export type StarFill = "full" | "half" | "empty";

/** Five stars for an average, rounded to the nearest half star. */
export function starFill(average: number): StarFill[] {
  const halves = Math.round(Math.min(Math.max(average, 0), MAX_RATING) * 2);
  return Array.from({ length: MAX_RATING }, (_, index) => {
    const remaining = halves - index * 2;
    if (remaining >= 2) return "full";
    if (remaining === 1) return "half";
    return "empty";
  });
}

/** Count of reviews per star, from 5 down to 1, including zeros. */
export function ratingDistribution(
  rows: ReadonlyArray<{ rating: number; count: number }>,
): Array<{ rating: number; count: number }> {
  const counts = new Map(rows.map((row) => [row.rating, row.count]));
  return Array.from({ length: MAX_RATING }, (_, index) => {
    const rating = MAX_RATING - index;
    return { rating, count: counts.get(rating) ?? 0 };
  });
}

/** Public name for a reviewer: "Jamie Rivera" → "Jamie R.". Never the email. */
export function reviewerDisplayName(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const [first, ...rest] = parts;
  if (!first) return "Verified buyer";
  const last = rest.at(-1);
  return last ? `${first} ${last.charAt(0).toUpperCase()}.` : first;
}
