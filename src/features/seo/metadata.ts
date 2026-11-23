import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { SITE_NAME } from "./json-ld";

const OG_LOCALES: Record<Locale, string> = { en: "en_US", ar: "ar_AR" };

/**
 * Open Graph fields every page shares. Next merges metadata shallowly, so a page
 * that sets its own `openGraph` must spread this in or it loses siteName/locale.
 */
export function baseOpenGraphFor(locale: Locale) {
  return {
    siteName: SITE_NAME,
    locale: OG_LOCALES[locale],
    alternateLocale: Object.entries(OG_LOCALES)
      .filter(([key]) => key !== locale)
      .map(([, value]) => value),
    type: "website",
  } satisfies NonNullable<Metadata["openGraph"]>;
}

/** Site-wide defaults: title template, description, OG and Twitter cards. */
export async function localizedSiteMetadata(locale: Locale): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "seo" });
  return {
    title: { default: t("defaultTitle"), template: t("titleTemplate", { title: "%s" }) },
    description: t("description"),
    applicationName: SITE_NAME,
    openGraph: { ...baseOpenGraphFor(locale), title: t("defaultTitle") },
    twitter: { card: "summary_large_image" },
    formatDetection: { telephone: false },
  };
}
