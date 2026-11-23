"use client";

import { useState, type FormEvent } from "react";
import { XIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CouponSummary } from "@/features/cart/quote";
import { useCartStore } from "@/features/cart/store";
import type { Locale } from "@/i18n/routing";
import { formatMoney } from "@/lib/format";

export function CouponForm({ coupon }: { coupon: CouponSummary | null }) {
  const setCouponCode = useCartStore((state) => state.setCouponCode);
  const [draft, setDraft] = useState("");
  const t = useTranslations("cart");
  const locale = useLocale() as Locale;

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const code = draft.trim();
    if (code) setCouponCode(code);
    setDraft("");
  }

  if (coupon?.status === "applied") {
    return (
      <div className="flex items-center justify-between rounded-lg border border-dashed px-3 py-2 text-sm">
        <span>
          {t.rich("couponApplied", {
            code: () => (
              <strong data-testid="applied-coupon" dir="ltr">
                {coupon.code}
              </strong>
            ),
          })}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("removeCoupon", { code: coupon.code })}
          onClick={() => setCouponCode(null)}
        >
          <XIcon />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <label htmlFor="coupon-code" className="sr-only">
          {t("discountCode")}
        </label>
        <Input
          id="coupon-code"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t("discountCode")}
          autoComplete="off"
          maxLength={40}
          aria-describedby={coupon?.status === "rejected" ? "coupon-error" : undefined}
        />
        <Button type="submit" variant="outline">
          {t("apply")}
        </Button>
      </form>
      {coupon?.status === "rejected" && (
        <p id="coupon-error" className="text-destructive text-sm" role="alert">
          <span dir="ltr">{coupon.code}</span>:{" "}
          {t(`couponErrors.${coupon.reason}`, {
            minimum: formatMoney(coupon.minSubtotalCents ?? 0, locale),
          })}{" "}
          <button
            type="button"
            className="underline underline-offset-2"
            onClick={() => setCouponCode(null)}
          >
            {t("clear")}
          </button>
        </p>
      )}
    </div>
  );
}
