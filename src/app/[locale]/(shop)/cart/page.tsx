import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { CartContents } from "@/components/shop/cart/cart-contents";
import { CheckoutCancelledNotice } from "@/components/shop/cart/checkout-cancelled-notice";
import type { Locale } from "@/i18n/routing";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "cart" });
  return { title: t("pageTitle"), robots: { index: false } };
}

export default async function CartPage({ params }: PageProps) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations("cart");
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <Suspense fallback={null}>
        <CheckoutCancelledNotice />
      </Suspense>
      <CartContents />
    </div>
  );
}
