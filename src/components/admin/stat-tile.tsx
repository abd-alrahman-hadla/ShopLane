import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { relativeChange } from "@/features/admin/metrics";
import { intlLocale } from "@/lib/format";
import type { Locale } from "@/i18n/routing";

type StatTileProps = {
  label: string;
  value: string;
  /** Compare against the previous equal period. */
  current?: number;
  previous?: number;
  periodLabel?: string;
};

/** Label · value · optional signed delta (icon + text, never color alone). */
export function StatTile({ label, value, current, previous, periodLabel }: StatTileProps) {
  const t = useTranslations("admin.dashboard");
  const percent = new Intl.NumberFormat(intlLocale(useLocale() as Locale), {
    style: "percent",
    maximumFractionDigits: 0,
    signDisplay: "always",
  });
  const change =
    current !== undefined && previous !== undefined ? relativeChange(current, previous) : null;
  const direction = change === null || change === 0 ? "flat" : change > 0 ? "up" : "down";
  const Icon =
    direction === "up" ? ArrowUpRightIcon : direction === "down" ? ArrowDownRightIcon : MinusIcon;
  const color =
    direction === "up"
      ? "var(--viz-delta-up)"
      : direction === "down"
        ? "var(--viz-delta-down)"
        : "var(--viz-muted)";

  return (
    <div className="bg-card flex flex-col gap-1 rounded-xl border p-4" data-testid="stat-tile">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      {periodLabel && current !== undefined && previous !== undefined && (
        <span className="flex items-center gap-1 text-xs">
          <Icon className="size-3.5" style={{ color }} aria-hidden />
          {/* Text stays in ink for contrast; the colored icon carries the direction. */}
          <span className="text-foreground font-medium">
            {change === null ? t("new") : percent.format(change)}
          </span>
          <span className="text-muted-foreground">{t("vsPrevious", { period: periodLabel })}</span>
        </span>
      )}
    </div>
  );
}
