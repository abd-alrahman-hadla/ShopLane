import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AccountNav } from "@/components/shop/account/account-nav";
import type { Locale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth-guards";

type LayoutProps = { children: React.ReactNode; params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Pick<LayoutProps, "params">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "account" });
  return {
    title: { default: t("title"), template: t("titleTemplate", { title: "%s" }) },
    robots: { index: false },
  };
}

/** Account pages read the session, so they render dynamically (catalog pages stay static). */
export default async function AccountLayout({ children, params }: LayoutProps) {
  setRequestLocale((await params).locale as Locale);
  const [t, user] = await Promise.all([getTranslations("account"), requireUser("/account")]);
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6 flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">
          {user.name ? t("greeting", { name: user.name }) : user.email}
        </p>
      </header>
      <div className="grid gap-8 lg:grid-cols-[12rem_1fr]">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
