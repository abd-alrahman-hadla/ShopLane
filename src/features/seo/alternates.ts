import type { Metadata } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

/**
 * Canonical URL for this language plus hreflang links to every language
 * (x-default points at English). Paths are resolved against metadataBase.
 */
export function alternatesFor(path: string, locale: Locale): NonNullable<Metadata["alternates"]> {
  const languages: Record<string, string> = {};
  for (const candidate of routing.locales) {
    languages[candidate] = getPathname({ href: path, locale: candidate });
  }
  languages["x-default"] = getPathname({ href: path, locale: routing.defaultLocale });
  return { canonical: getPathname({ href: path, locale }), languages };
}
