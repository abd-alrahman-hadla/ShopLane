import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // E2E builds use their own folder so they never clobber a running `next dev`.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

export default nextConfig;
