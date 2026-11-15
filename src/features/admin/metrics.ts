/** Dashboard metrics (pure). Days are calendar days in the store's time zone. */

export type PaidOrder = { paidAt: Date; totalCents: number; refundedCents: number };

export type WindowStats = {
  revenueCents: number;
  orders: number;
  /** Average order value, rounded to whole cents; 0 when there are no orders. */
  aovCents: number;
};

export type WindowComparison = WindowStats & { previous: WindowStats };

export type DashboardWindows = {
  today: WindowStats;
  last7: WindowComparison;
  last30: WindowComparison;
};

export type DailyRevenue = { date: string; revenueCents: number; orders: number };

const DAY_KEY_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

/** "YYYY-MM-DD" for an instant, in the given time zone. */
export function dayKey(date: Date, timeZone: string): string {
  let formatter = DAY_KEY_FORMATTERS.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    DAY_KEY_FORMATTERS.set(timeZone, formatter);
  }
  return formatter.format(date);
}

/** Calendar arithmetic on day keys (DST-safe: never adds hours to instants). */
export function shiftDayKey(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  const shifted = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, (day ?? 1) + days));
  return shifted.toISOString().slice(0, 10);
}

/** What the store kept: total minus refunds, never negative. */
export function netRevenueCents(order: Pick<PaidOrder, "totalCents" | "refundedCents">): number {
  return Math.max(0, order.totalCents - order.refundedCents);
}

function stats(orders: readonly PaidOrder[]): WindowStats {
  const revenueCents = orders.reduce((sum, order) => sum + netRevenueCents(order), 0);
  return {
    revenueCents,
    orders: orders.length,
    aovCents: orders.length === 0 ? 0 : Math.round(revenueCents / orders.length),
  };
}

/** Orders whose paid day falls in [firstKey, lastKey] (inclusive). */
function inDays(
  orders: readonly PaidOrder[],
  timeZone: string,
  firstKey: string,
  lastKey: string,
): PaidOrder[] {
  return orders.filter((order) => {
    const key = dayKey(order.paidAt, timeZone);
    return key >= firstKey && key <= lastKey;
  });
}

function compare(
  orders: readonly PaidOrder[],
  timeZone: string,
  todayKey: string,
  days: number,
): WindowComparison {
  const current = inDays(orders, timeZone, shiftDayKey(todayKey, -(days - 1)), todayKey);
  const previous = inDays(
    orders,
    timeZone,
    shiftDayKey(todayKey, -(2 * days - 1)),
    shiftDayKey(todayKey, -days),
  );
  return { ...stats(current), previous: stats(previous) };
}

/**
 * Today, the last 7 days and the last 30 days (each including today), with the
 * equal-length period just before for comparison.
 */
export function revenueWindows(
  orders: readonly PaidOrder[],
  options: { now: Date; timeZone: string },
): DashboardWindows {
  const todayKey = dayKey(options.now, options.timeZone);
  return {
    today: stats(inDays(orders, options.timeZone, todayKey, todayKey)),
    last7: compare(orders, options.timeZone, todayKey, 7),
    last30: compare(orders, options.timeZone, todayKey, 30),
  };
}

/** Net revenue per day for the last `days` days (oldest first), with empty days as zero. */
export function bucketRevenueByDay(
  orders: readonly PaidOrder[],
  options: { now: Date; timeZone: string; days: number },
): DailyRevenue[] {
  const todayKey = dayKey(options.now, options.timeZone);
  const buckets = new Map<string, DailyRevenue>();
  for (let offset = options.days - 1; offset >= 0; offset -= 1) {
    const date = shiftDayKey(todayKey, -offset);
    buckets.set(date, { date, revenueCents: 0, orders: 0 });
  }
  for (const order of orders) {
    const bucket = buckets.get(dayKey(order.paidAt, options.timeZone));
    if (!bucket) continue;
    bucket.revenueCents += netRevenueCents(order);
    bucket.orders += 1;
  }
  return [...buckets.values()];
}

/** Signed change between periods as a fraction (0.25 = +25%); null when there is no baseline. */
export function relativeChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / previous;
}
