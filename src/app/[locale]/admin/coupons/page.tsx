import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CouponDialog } from "@/components/admin/coupon-dialog";
import { CouponActiveSwitch, DeleteCouponButton } from "@/components/admin/coupon-row-actions";
import { requireAdminPage } from "@/features/admin/guard";
import type { Locale } from "@/i18n/routing";
import { db } from "@/lib/db";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "admin.coupons" });
  return { title: t("title") };
}

type Translate = Awaited<ReturnType<typeof getTranslations<"admin.coupons">>>;

function windowLabel(
  startsAt: Date | null,
  endsAt: Date | null,
  now: Date,
  locale: Locale,
  t: Translate,
): string {
  const date = (value: Date) => formatDate(value, locale);
  if (!startsAt && !endsAt) return t("always");
  if (endsAt && endsAt <= now) return t("ended", { date: date(endsAt) });
  if (startsAt && startsAt > now) return t("starts", { date: date(startsAt) });
  return endsAt ? t("until", { date: date(endsAt) }) : t("since", { date: date(startsAt!) });
}

export default async function AdminCouponsPage({ params }: PageProps) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [t] = await Promise.all([
    getTranslations("admin.coupons"),
    requireAdminPage("/admin/coupons"),
  ]);
  const coupons = await db.coupon.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { orders: true } } },
  });
  const now = new Date();

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <CouponDialog />
      </header>
      <div className="bg-card overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[44rem] text-sm" data-testid="admin-coupons">
          <thead className="text-muted-foreground border-b text-start">
            <tr>
              <th scope="col" className="p-3 text-start font-normal">
                {t("code")}
              </th>
              <th scope="col" className="p-3 text-start font-normal">
                {t("discount")}
              </th>
              <th scope="col" className="p-3 text-start font-normal">
                {t("minimum")}
              </th>
              <th scope="col" className="p-3 text-end font-normal">
                {t("used")}
              </th>
              <th scope="col" className="p-3 text-start font-normal">
                {t("window")}
              </th>
              <th scope="col" className="p-3 text-start font-normal">
                {t("active")}
              </th>
              <th scope="col" className="p-3">
                <span className="sr-only">{t("actions")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon) => {
              const used = coupon.redemptionCount > 0 || coupon._count.orders > 0;
              return (
                <tr key={coupon.id} className="border-t" data-testid="coupon-row">
                  <td className="p-3 font-mono font-medium" dir="ltr">
                    {coupon.code}
                  </td>
                  <td className="p-3">
                    {coupon.type === "PERCENTAGE"
                      ? t("percentOff", { value: coupon.value })
                      : t("amountOff", { amount: formatMoney(coupon.value, locale) })}
                  </td>
                  <td className="p-3">
                    {coupon.minSubtotalCents ? formatMoney(coupon.minSubtotalCents, locale) : "—"}
                  </td>
                  <td className="p-3 text-end tabular-nums">
                    {formatNumber(coupon.redemptionCount, locale)}
                    {coupon.maxRedemptions !== null &&
                      ` / ${formatNumber(coupon.maxRedemptions, locale)}`}
                  </td>
                  <td className="p-3">
                    {windowLabel(coupon.startsAt, coupon.endsAt, now, locale, t)}
                  </td>
                  <td className="p-3">
                    <CouponActiveSwitch
                      couponId={coupon.id}
                      code={coupon.code}
                      isActive={coupon.isActive}
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <CouponDialog
                        coupon={{
                          id: coupon.id,
                          code: coupon.code,
                          type: coupon.type,
                          value: coupon.value,
                          minSubtotalCents: coupon.minSubtotalCents,
                          maxRedemptions: coupon.maxRedemptions,
                          redemptionCount: coupon.redemptionCount,
                          startsAt: coupon.startsAt?.toISOString() ?? null,
                          endsAt: coupon.endsAt?.toISOString() ?? null,
                          isActive: coupon.isActive,
                        }}
                      />
                      <DeleteCouponButton couponId={coupon.id} code={coupon.code} used={used} />
                    </div>
                  </td>
                </tr>
              );
            })}
            {coupons.length === 0 && (
              <tr>
                <td colSpan={7} className="text-muted-foreground p-6 text-center">
                  {t("none")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
