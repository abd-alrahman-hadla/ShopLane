import type { Metadata } from "next";
import { CoffeeIcon, ExternalLinkIcon, LogOutIcon } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { DemoResetButton } from "@/components/admin/demo-reset-button";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { LocalizedThemeToggle } from "@/components/theme/localized-theme-toggle";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/features/admin/guard";
import { signOutAction } from "@/features/auth/actions";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { isDemoMode } from "@/lib/env";

type LayoutProps = { children: React.ReactNode; params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Pick<LayoutProps, "params">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const t = await getTranslations({ locale, namespace: "admin" });
  return {
    title: { default: t("title"), template: t("titleTemplate", { title: "%s" }) },
    robots: { index: false, follow: false },
  };
}

/**
 * Admin shell. Every page and every action re-checks the role on the server;
 * this layout is only the first gate (sign-in for guests, 404 for customers).
 */
export default async function AdminLayout({ children, params }: LayoutProps) {
  setRequestLocale((await params).locale as Locale);
  const [t, ta, admin] = await Promise.all([
    getTranslations("admin"),
    getTranslations("auth"),
    requireAdminPage("/admin"),
  ]);
  return (
    <div className="bg-muted/30 min-h-dvh">
      <header className="bg-background sticky top-0 z-30 border-b">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 sm:px-6">
          <Link href="/admin" className="flex items-center gap-2 font-semibold">
            <CoffeeIcon className="text-primary size-5" aria-hidden />
            <span dir="ltr">ShopLane</span>
          </Link>
          <span className="text-muted-foreground ms-auto hidden text-sm md:inline" dir="ltr">
            {admin.email}
          </span>
          <div className="ms-auto flex items-center gap-1 md:ms-0">
            {isDemoMode() && <DemoResetButton />}
            <LanguageSwitcher />
            <LocalizedThemeToggle />
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 px-1 text-sm"
            >
              <span className="hidden sm:inline">{t("viewStore")}</span>
              <span className="sm:hidden">{t("store")}</span>
              <ExternalLinkIcon className="size-3.5 rtl:-scale-x-100" aria-hidden />
            </Link>
            {/* A plain form: signs out server-side and works before JavaScript loads. */}
            <form action={signOutAction}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                aria-label={ta("signOut")}
                data-testid="admin-sign-out"
              >
                <LogOutIcon data-icon="inline-start" className="rtl:-scale-x-100" />
                <span className="hidden sm:inline">{ta("signOut")}</span>
              </Button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[12rem_1fr]">
        <AdminNav />
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
