import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { absoluteUrl, localePrefix } from "./json-ld";

/** Private or per-visitor pages that must never be crawled (in every language). */
export const DISALLOWED_PATHS = [
  "/admin",
  "/account",
  "/cart",
  "/checkout",
  "/api/",
  "/sign-in",
  "/search",
] as const;

/** Path in a language: "/products" → "/ar/products"; English keeps no prefix. */
export function localizedPath(path: string, locale: string): string {
  const prefix = localePrefix(locale);
  if (!prefix) return path;
  return path === "/" ? prefix : `${prefix}${path}`;
}

/** DISALLOWED_PATHS for every language (API routes have no language prefix). */
export function disallowedPaths(): string[] {
  return DISALLOWED_PATHS.flatMap((path) =>
    path.startsWith("/api/")
      ? [path]
      : routing.locales.map((locale) => localizedPath(path, locale)),
  );
}

/**
 * robots.txt rules. Only the production deployment is indexable, so Vercel
 * preview URLs (and local builds) never end up in search results.
 */
export function buildRobots(siteUrl: string, isProduction: boolean): MetadataRoute.Robots {
  return {
    rules: isProduction
      ? { userAgent: "*", allow: "/", disallow: disallowedPaths() }
      : { userAgent: "*", disallow: "/" },
    sitemap: absoluteUrl(siteUrl, "/sitemap.xml"),
    host: new URL(siteUrl).origin,
  };
}

export type SitemapInput = { path: string; updatedAt: string };

type Page = Omit<MetadataRoute.Sitemap[number], "url" | "alternates"> & { path: string };

/** hreflang links for one page: every language plus x-default (English). */
function languageAlternates(siteUrl: string, path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = absoluteUrl(siteUrl, localizedPath(path, locale));
  }
  languages["x-default"] = absoluteUrl(siteUrl, localizedPath(path, routing.defaultLocale));
  return languages;
}

/**
 * Home and /products first (most recent change wins), then each catalog URL.
 * Every page is listed once per language, each entry linking to all of them.
 */
export function buildSitemap(siteUrl: string, records: SitemapInput[]): MetadataRoute.Sitemap {
  const newest = records.reduce<string | undefined>(
    (latest, record) => (!latest || record.updatedAt > latest ? record.updatedAt : latest),
    undefined,
  );
  const lastModified = newest ? new Date(newest) : undefined;
  const pages: Page[] = [
    { path: "/", lastModified, changeFrequency: "daily", priority: 1 },
    { path: "/products", lastModified, changeFrequency: "daily", priority: 0.9 },
    ...records.map((record) => ({
      path: record.path,
      lastModified: new Date(record.updatedAt),
      changeFrequency: "weekly" as const,
      priority: record.path.startsWith("/categories/") ? 0.8 : 0.7,
    })),
  ];
  return routing.locales.flatMap((locale) =>
    pages.map(({ path, ...page }) => ({
      ...page,
      url: absoluteUrl(siteUrl, localizedPath(path, locale)),
      alternates: { languages: languageAlternates(siteUrl, path) },
    })),
  );
}
