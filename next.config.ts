import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // E2E builds use their own folder so they never clobber a running `next dev`.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      // UploadThing (admin product uploads)
      { protocol: "https", hostname: "*.ufs.sh" },
      { protocol: "https", hostname: "utfs.io" },
    ],
  },
};

export default nextConfig;
