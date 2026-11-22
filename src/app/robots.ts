import type { MetadataRoute } from "next";
import { buildRobots } from "@/features/seo/crawl";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  // On Vercel only the production deployment is indexable (previews are not).
  // Elsewhere (self-hosted `next start`) the site is treated as production.
  const vercelEnv = process.env.VERCEL_ENV;
  return buildRobots(
    env.NEXT_PUBLIC_SITE_URL,
    vercelEnv === undefined || vercelEnv === "production",
  );
}
