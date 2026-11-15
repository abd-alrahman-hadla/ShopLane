"use client";

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
import { formatCents } from "@/lib/money";

const dayLabel = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const fullDayLabel = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const compactDollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Day keys are calendar dates; format them at UTC midnight so no zone shifts the day. */
function parseDay(key: string): Date {
  return new Date(`${key}T00:00:00Z`);
}

type ChartTooltipProps = { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> };

function ChartTooltip({ active, payload }: ChartTooltipProps) {
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
        <span className="font-semibold tabular-nums">{formatCents(point.revenueCents)}</span>
      </div>
      <div className="text-muted-foreground text-xs">
        {fullDayLabel.format(parseDay(point.date))} · {point.orders} order
        {point.orders === 1 ? "" : "s"}
      </div>
    </div>
  );
}

/**
 * Net revenue per day, last 30 days. Single series: no legend (the heading
 * names it), crosshair tooltip on hover, and a data table for non-hover access.
 */
export function RevenueChart({ data }: { data: DailyRevenue[] }) {
  const total = data.reduce((sum, day) => sum + day.revenueCents, 0);
  return (
    <div className="flex flex-col gap-3">
      <div
        className="h-64 w-full"
        role="img"
        aria-label={`Daily revenue for the last ${data.length} days, ${formatCents(total)} in total. A data table follows.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--viz-grid)" strokeWidth={1} />
            <XAxis
              dataKey="date"
              tickFormatter={(key: string) => dayLabel.format(parseDay(key))}
              tick={{ fill: "var(--viz-muted)", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "var(--viz-axis)" }}
              interval="preserveStartEnd"
              minTickGap={32}
            />
            <YAxis
              tickFormatter={(cents: number) => compactDollars.format(cents / 100)}
              tick={{ fill: "var(--viz-muted)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={56}
              allowDecimals={false}
            />
            <Tooltip
              content={(props) => <ChartTooltip active={props.active} payload={props.payload} />}
              cursor={{ stroke: "var(--viz-axis)", strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="revenueCents"
              name="Revenue"
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
          Show data table
        </summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead className="text-muted-foreground">
            <tr>
              <th scope="col" className="py-1 font-normal">
                Day
              </th>
              <th scope="col" className="py-1 text-right font-normal">
                Orders
              </th>
              <th scope="col" className="py-1 text-right font-normal">
                Net revenue
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((day) => (
              <tr key={day.date} className="border-t">
                <td className="py-1">{fullDayLabel.format(parseDay(day.date))}</td>
                <td className="py-1 text-right">{day.orders}</td>
                <td className="py-1 text-right">{formatCents(day.revenueCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
