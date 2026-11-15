import type { Metadata } from "next";
import { CouponDialog } from "@/components/admin/coupon-dialog";
import { CouponActiveSwitch, DeleteCouponButton } from "@/components/admin/coupon-row-actions";
import { requireAdminPage } from "@/features/admin/guard";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = { title: "Coupons" };

const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

function windowLabel(startsAt: Date | null, endsAt: Date | null, now: Date): string {
  if (!startsAt && !endsAt) return "Always";
  if (endsAt && endsAt <= now) return `Ended ${dateFormat.format(endsAt)}`;
  if (startsAt && startsAt > now) return `Starts ${dateFormat.format(startsAt)}`;
  return endsAt ? `Until ${dateFormat.format(endsAt)}` : `Since ${dateFormat.format(startsAt!)}`;
}

export default async function AdminCouponsPage() {
  await requireAdminPage("/admin/coupons");
  const coupons = await db.coupon.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { orders: true } } },
  });
  const now = new Date();

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Coupons</h1>
        <CouponDialog />
      </header>
      <div className="bg-card overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[44rem] text-sm" data-testid="admin-coupons">
          <thead className="text-muted-foreground border-b text-left">
            <tr>
              <th scope="col" className="p-3 font-normal">
                Code
              </th>
              <th scope="col" className="p-3 font-normal">
                Discount
              </th>
              <th scope="col" className="p-3 font-normal">
                Minimum
              </th>
              <th scope="col" className="p-3 text-right font-normal">
                Used
              </th>
              <th scope="col" className="p-3 font-normal">
                Window
              </th>
              <th scope="col" className="p-3 font-normal">
                Active
              </th>
              <th scope="col" className="p-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon) => {
              const used = coupon.redemptionCount > 0 || coupon._count.orders > 0;
              return (
                <tr key={coupon.id} className="border-t" data-testid="coupon-row">
                  <td className="p-3 font-mono font-medium">{coupon.code}</td>
                  <td className="p-3">
                    {coupon.type === "PERCENTAGE"
                      ? `${coupon.value}% off`
                      : `${formatCents(coupon.value)} off`}
                  </td>
                  <td className="p-3">
                    {coupon.minSubtotalCents ? formatCents(coupon.minSubtotalCents) : "—"}
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    {coupon.redemptionCount}
                    {coupon.maxRedemptions !== null && ` / ${coupon.maxRedemptions}`}
                  </td>
                  <td className="p-3">{windowLabel(coupon.startsAt, coupon.endsAt, now)}</td>
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
                  No coupons yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
