"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyRevenue } from "@/features/admin/metrics";
import type { Locale } from "@/i18n/routing";
import { formatCurrency, formatMoney, intlLocale } from "@/lib/format";

/** Day keys are calendar dates; format them at UTC midnight so no zone shifts the day. */
function parseDay(key: string): Date {
  return new Date(`${key}T00:00:00Z`);
}

function useFormatters() {
  const locale = useLocale() as Locale;
  const tag = intlLocale(locale);
  return {
    locale,
    day: new Intl.DateTimeFormat(tag, { month: "short", day: "numeric", timeZone: "UTC" }),
    fullDay: new Intl.DateTimeFormat(tag, {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }),
    compactDollars: (dollars: number) =>
      formatCurrency(dollars, locale, "usd", { notation: "compact", maximumFractionDigits: 1 }),
    money: (cents: number) => formatMoney(cents, locale),
  };
}

type ChartTooltipProps = { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> };

function ChartTooltip({ active, payload }: ChartTooltipProps) {
  const t = useTranslations("admin.dashboard");
  const format = useFormatters();
  const point = payload?.[0]?.payload as DailyRevenue | undefined;
  if (!active || !point) return null;
  return (
    <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-sm shadow-md">
      {/* Values lead, labels follow. */}
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="h-0.5 w-3 rounded-full"
          style={{ background: "var(--viz-series-1)" }}
        />
        <span className="font-semibold tabular-nums">{format.money(point.revenueCents)}</span>
      </div>
      <div className="text-muted-foreground text-xs">
        {format.fullDay.format(parseDay(point.date))} · {t("orderCount", { count: point.orders })}
      </div>
    </div>
  );
}

/**
 * Net revenue per day, last 30 days. Single series: no legend (the heading
 * names it), crosshair tooltip on hover, and a data table for non-hover access.
 * Time runs left to right in every language, so the plot itself stays LTR.
 */
export function RevenueChart({ data }: { data: DailyRevenue[] }) {
  const t = useTranslations("admin.dashboard");
  const format = useFormatters();
  const total = data.reduce((sum, day) => sum + day.revenueCents, 0);
  return (
    <div className="flex flex-col gap-3">
      <div
        className="h-64 w-full"
        dir="ltr"
        role="img"
        aria-label={t("chartLabel", { days: data.length, total: format.money(total) })}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--viz-grid)" strokeWidth={1} />
            <XAxis
              dataKey="date"
              tickFormatter={(key: string) => format.day.format(parseDay(key))}
              tick={{ fill: "var(--viz-muted)", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "var(--viz-axis)" }}
              interval="preserveStartEnd"
              minTickGap={32}
            />
            <YAxis
              tickFormatter={(cents: number) => format.compactDollars(cents / 100)}
              tick={{ fill: "var(--viz-muted)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={64}
              allowDecimals={false}
            />
            <Tooltip
              content={(props) => <ChartTooltip active={props.active} payload={props.payload} />}
              cursor={{ stroke: "var(--viz-axis)", strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="revenueCents"
              name={t("revenue")}
              stroke="var(--viz-series-1)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              fill="var(--viz-series-1)"
              fillOpacity={0.1}
              activeDot={{
                r: 4,
                fill: "var(--viz-series-1)",
                stroke: "var(--card)",
                strokeWidth: 2,
              }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <details className="text-sm">
        <summary className="text-muted-foreground hover:text-foreground cursor-pointer">
          {t("showTable")}
        </summary>
        <table className="mt-2 w-full text-start tabular-nums">
          <thead className="text-muted-foreground">
            <tr>
              <th scope="col" className="py-1 font-normal">
                {t("day")}
              </th>
              <th scope="col" className="py-1 text-end font-normal">
                {t("orders")}
              </th>
              <th scope="col" className="py-1 text-end font-normal">
                {t("netRevenue")}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((day) => (
              <tr key={day.date} className="border-t">
                <td className="py-1">{format.fullDay.format(parseDay(day.date))}</td>
                <td className="py-1 text-end">{day.orders}</td>
                <td className="py-1 text-end">{format.money(day.revenueCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
