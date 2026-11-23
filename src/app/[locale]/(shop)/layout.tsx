import { setRequestLocale } from "next-intl/server";
import { ShopProviders } from "@/components/shop/providers";
import { SiteFooter } from "@/components/shop/site-footer";
import { SiteHeader } from "@/components/shop/site-header";
import { getCategories } from "@/features/catalog/queries";
import type { Locale } from "@/i18n/routing";

type ShopLayoutProps = { children: React.ReactNode; params: Promise<{ locale: string }> };

export default async function ShopLayout({ children, params }: ShopLayoutProps) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const categories = await getCategories(locale);
  // Never call auth() here: reading cookies would make every shop page dynamic.
  return (
    <ShopProviders>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader categories={categories} />
        <main className="flex-1">{children}</main>
        <SiteFooter categories={categories} />
      </div>
    </ShopProviders>
  );
}
