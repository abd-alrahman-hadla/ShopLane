import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

type PriceProps = {
  cents: number;
  compareAtCents?: number | null;
  /** Prefix with "From" when the product has several prices. */
  from?: boolean;
  className?: string;
};

export function Price({ cents, compareAtCents, from = false, className }: PriceProps) {
  const t = useTranslations("product");
  const locale = useLocale() as Locale;
  const onSale = compareAtCents !== undefined && compareAtCents !== null && compareAtCents > cents;
  return (
    <span className={cn("inline-flex items-baseline gap-2 tabular-nums", className)}>
      <span className={cn("font-medium", onSale && "text-danger")} data-testid="price">
        {from && <span className="text-muted-foreground font-normal">{t("from")} </span>}
        {formatMoney(cents, locale)}
      </span>
      {onSale && (
        <span className="text-muted-foreground text-sm line-through">
          <span className="sr-only">{t("was")} </span>
          {formatMoney(compareAtCents, locale)}
        </span>
      )}
    </span>
  );
}
