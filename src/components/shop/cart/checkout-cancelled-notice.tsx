"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

export function CheckoutCancelledNotice() {
  const searchParams = useSearchParams();
  const t = useTranslations("cart");
  if (searchParams.get("checkout") !== "cancelled") return null;
  return (
    <p className="bg-secondary rounded-lg px-4 py-3 text-sm" role="status">
      {t("cancelled")}
    </p>
  );
}
