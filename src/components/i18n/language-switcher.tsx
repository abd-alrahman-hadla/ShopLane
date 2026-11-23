"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/**
 * Two languages, so this is one link to the other one. It's a real link (works
 * without JavaScript, crawlable); with JavaScript it also keeps the query
 * string, so filters and search survive the switch. next-intl stores the choice
 * in the NEXT_LOCALE cookie.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("language");
  const pathname = usePathname();
  const router = useRouter();
  const target = routing.locales.find((candidate) => candidate !== locale) ?? routing.defaultLocale;
  const name = t(target);

  return (
    <Link
      href={pathname}
      locale={target}
      hrefLang={target}
      lang={target}
      aria-label={t("switchTo", { language: name })}
      data-testid="language-switcher"
      className={cn(
        "text-muted-foreground hover:text-foreground inline-flex h-9 items-center rounded-lg px-2 text-sm font-medium",
        className,
      )}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        router.replace(`${pathname}${window.location.search}`, { locale: target, scroll: false });
      }}
    >
      {name}
    </Link>
  );
}
