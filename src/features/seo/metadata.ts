import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "./json-ld";

/**
 * Open Graph fields every page shares. Next merges metadata shallowly, so a page
 * that sets its own `openGraph` must spread this in or it loses siteName/locale.
 */
export const baseOpenGraph = {
  siteName: SITE_NAME,
  locale: "en_US",
  type: "website",
} satisfies NonNullable<Metadata["openGraph"]>;

export const siteMetadata = {
  title: {
    default: "ShopLane: specialty coffee & brewing gear",
    template: "%s · ShopLane",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { ...baseOpenGraph, title: "ShopLane: specialty coffee & brewing gear" },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
} satisfies Metadata;
