import { createTranslator } from "next-intl";
import { directionOf, isLocale, routing, type Locale } from "@/i18n/routing";
import ar from "../../messages/ar.json";
import en from "../../messages/en.json";

const MESSAGES = { en, ar } as const;

/**
 * Translator for emails. They're sent outside a page request (webhooks, admin
 * actions, Auth.js), so the locale comes from the order or the sign-in link,
 * not from the URL. Unknown locales fall back to English.
 */
export function emailI18n(value: string | null | undefined) {
  const locale: Locale = isLocale(value) ? value : routing.defaultLocale;
  const t = createTranslator({ locale, messages: MESSAGES[locale], namespace: "email" });
  return { locale, dir: directionOf(locale), t };
}

export type EmailI18n = ReturnType<typeof emailI18n>;

/** The locale of a path like "/ar/account" (English for unprefixed paths). */
export function localeOfPath(path: string): Locale {
  const segment = path.split("/")[1];
  return isLocale(segment) ? segment : routing.defaultLocale;
}

/**
 * The shopper's language for an Auth.js sign-in link: the callback URL inside
 * it carries the locale prefix of the page they signed in from.
 */
export function localeOfSignInUrl(url: string): Locale {
  try {
    const link = new URL(url);
    const callback = link.searchParams.get("callbackUrl");
    if (!callback) return routing.defaultLocale;
    return localeOfPath(new URL(callback, link.origin).pathname);
  } catch {
    return routing.defaultLocale;
  }
}
