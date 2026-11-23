import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/features/seo/json-ld";
import { OG_COLORS, OG_SIZE } from "@/features/seo/og";

export const alt = "ShopLane: specialty coffee and brewing gear";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        background: OG_COLORS.espresso,
        color: OG_COLORS.paper,
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 44, fontWeight: 700 }}
      >
        <svg
          width="56"
          height="56"
          viewBox="0 0 24 24"
          fill="none"
          stroke={OG_COLORS.paper}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10 2v2" />
          <path d="M14 2v2" />
          <path d="M6 2v2" />
          <path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1" />
        </svg>
        {SITE_NAME}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, maxWidth: 900 }}>
          Better coffee starts at home.
        </div>
        <div style={{ fontSize: 32, opacity: 0.8 }}>
          Single origins, house blends and the brewing gear we use in the roastery.
        </div>
      </div>
    </div>,
    size,
  );
}
