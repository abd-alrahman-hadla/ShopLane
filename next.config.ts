import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // E2E builds use their own folder so they never clobber a running `next dev`.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  experimental: {
    // shadcn imports primitives from the "radix-ui" umbrella; without this every
    // primitive (~390 KB) ships to every page.
    optimizePackageImports: ["radix-ui"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // Product photos never change at a URL, so let the optimizer cache them for 30 days.
    minimumCacheTTL: 2_592_000,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      // UploadThing (admin product uploads)
      { protocol: "https", hostname: "*.ufs.sh" },
      { protocol: "https", hostname: "utfs.io" },
    ],
  },
};

export default nextConfig;
