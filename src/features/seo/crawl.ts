import type { MetadataRoute } from "next";
import { absoluteUrl } from "./json-ld";

/** Private or per-visitor pages that must never be crawled. */
export const DISALLOWED_PATHS = [
  "/admin",
  "/account",
  "/cart",
  "/checkout",
  "/api/",
  "/sign-in",
  "/search",
] as const;

/**
 * robots.txt rules. Only the production deployment is indexable, so Vercel
 * preview URLs (and local builds) never end up in search results.
 */
export function buildRobots(siteUrl: string, isProduction: boolean): MetadataRoute.Robots {
  return {
    rules: isProduction
      ? { userAgent: "*", allow: "/", disallow: [...DISALLOWED_PATHS] }
      : { userAgent: "*", disallow: "/" },
    sitemap: absoluteUrl(siteUrl, "/sitemap.xml"),
    host: new URL(siteUrl).origin,
  };
}

export type SitemapInput = { path: string; updatedAt: string };

/** Home and /products first (most recent change wins), then each catalog URL. */
export function buildSitemap(siteUrl: string, records: SitemapInput[]): MetadataRoute.Sitemap {
  const newest = records.reduce<string | undefined>(
    (latest, record) => (!latest || record.updatedAt > latest ? record.updatedAt : latest),
    undefined,
  );
  const lastModified = newest ? new Date(newest) : undefined;
  return [
    { url: absoluteUrl(siteUrl, "/"), lastModified, changeFrequency: "daily", priority: 1 },
    {
      url: absoluteUrl(siteUrl, "/products"),
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...records.map((record) => ({
      url: absoluteUrl(siteUrl, record.path),
      lastModified: new Date(record.updatedAt),
      changeFrequency: "weekly" as const,
      priority: record.path.startsWith("/categories/") ? 0.8 : 0.7,
    })),
  ];
}
