import type { MetadataRoute } from "next";
import { getSitemapRecords } from "@/features/catalog/queries";
import { buildSitemap } from "@/features/seo/crawl";
import { env } from "@/lib/env";

// Purged with the catalog tags on admin edits; hourly as a fallback.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemap(env.NEXT_PUBLIC_SITE_URL, await getSitemapRecords());
}
