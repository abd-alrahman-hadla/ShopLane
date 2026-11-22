import { ImageResponse } from "next/og";
import { getActiveProductSlugs, getProductBySlug } from "@/features/catalog/queries";
import { SITE_NAME } from "@/features/seo/json-ld";
import { loadPhoto, OG_COLORS, OG_SIZE } from "@/features/seo/og";
import { formatCents } from "@/lib/money";

export const alt = "Product photo, name and price";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const slugs = await getActiveProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export default async function ProductOpenGraphImage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  const photo = product?.images[0] ? await loadPhoto(product.images[0].url) : null;
  const prices = product?.variants.map((variant) => variant.priceCents) ?? [];
  const from = prices.length > 0 ? Math.min(...prices) : null;
  const ranged = prices.some((price) => price !== from);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: OG_COLORS.paper,
        color: OG_COLORS.ink,
      }}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- next/og renders plain <img>
        <img src={photo} alt="" width={540} height={630} style={{ objectFit: "cover" }} />
      ) : (
        <div style={{ width: 540, height: 630, display: "flex", background: OG_COLORS.espresso }} />
      )}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 56px",
        }}
      >
        <div style={{ fontSize: 30, fontWeight: 700, color: OG_COLORS.espresso }}>{SITE_NAME}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 24, color: OG_COLORS.muted, textTransform: "uppercase" }}>
            {product?.category.name ?? ""}
          </div>
          <div style={{ fontSize: 60, fontWeight: 700, lineHeight: 1.1 }}>
            {product?.name ?? "Specialty coffee"}
          </div>
          {from !== null && (
            <div style={{ fontSize: 40, color: OG_COLORS.espresso }}>
              {ranged ? `from ${formatCents(from)}` : formatCents(from)}
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 26,
            color: OG_COLORS.muted,
          }}
        >
          {product?.rating ? (
            <>
              {/* The built-in card font has no ★ glyph, so draw it. */}
              <svg width="26" height="26" viewBox="0 0 24 24" fill={OG_COLORS.espresso}>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              {`${product.rating.average.toFixed(1)} · ${product.rating.count} reviews`}
            </>
          ) : (
            "Roasted every Tuesday"
          )}
        </div>
      </div>
    </div>,
    size,
  );
}
