import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";

type PriceProps = {
  cents: number;
  compareAtCents?: number | null;
  /** Prefix with "From" when the product has several prices. */
  from?: boolean;
  className?: string;
};

export function Price({ cents, compareAtCents, from = false, className }: PriceProps) {
  const onSale = compareAtCents !== undefined && compareAtCents !== null && compareAtCents > cents;
  return (
    <span className={cn("inline-flex items-baseline gap-2 tabular-nums", className)}>
      <span className={cn("font-medium", onSale && "text-red-700")} data-testid="price">
        {from && <span className="text-muted-foreground font-normal">From </span>}
        {formatCents(cents)}
      </span>
      {onSale && (
        <span className="text-muted-foreground text-sm line-through">
          <span className="sr-only">Was </span>
          {formatCents(compareAtCents)}
        </span>
      )}
    </span>
  );
}
