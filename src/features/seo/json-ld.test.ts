import { describe, expect, it } from "vitest";
import type { ProductDetail } from "@/features/catalog/types";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  centsToPrice,
  productJsonLd,
  serializeJsonLd,
  siteJsonLd,
} from "./json-ld";

const SITE = "https://shoplane.example";
const NOW = new Date("2026-11-22T12:00:00Z");

function product(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: "p1",
    slug: "ethiopia-yirgacheffe",
    name: "Ethiopia Yirgacheffe",
    description: "Floral and bright.",
    category: { slug: "single-origin", name: "Single origin" },
    variants: [
      {
        id: "v1",
        sku: "ETH-250",
        title: "250 g",
        size: "250g",
        color: null,
        priceCents: 1850,
        compareAtPriceCents: null,
        stock: 4,
      },
      {
        id: "v2",
        sku: "ETH-1KG",
        title: "1 kg",
        size: "1kg",
        color: null,
        priceCents: 5600,
        compareAtPriceCents: null,
        stock: 0,
      },
    ],
    images: [{ id: "i1", url: "https://img.example/a.jpg", alt: "Bag", variantId: null }],
    rating: null,
    seoTitle: null,
    seoDescription: null,
    ...overrides,
  };
}

describe("productJsonLd", () => {
  it("emits one Offer per variant with price, currency and availability", () => {
    const data = productJsonLd(product(), SITE, NOW);
    expect(data["@type"]).toBe("Product");
    expect(data.url).toBe(`${SITE}/products/ethiopia-yirgacheffe`);
    expect(data.offers).toEqual([
      expect.objectContaining({
        "@type": "Offer",
        sku: "ETH-250",
        price: "18.50",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        url: `${SITE}/products/ethiopia-yirgacheffe?variant=ETH-250`,
        priceValidUntil: "2027-11-22",
      }),
      expect.objectContaining({
        sku: "ETH-1KG",
        price: "56.00",
        availability: "https://schema.org/OutOfStock",
      }),
    ]);
  });

  it("adds aggregateRating only when the product has reviews", () => {
    expect(productJsonLd(product(), SITE, NOW)).not.toHaveProperty("aggregateRating");
    const rated = productJsonLd(product({ rating: { average: 4.5, count: 12 } }), SITE, NOW);
    expect(rated.aggregateRating).toMatchObject({ ratingValue: 4.5, reviewCount: 12 });
  });
});

describe("breadcrumbJsonLd", () => {
  it("lists home, category and product with absolute URLs", () => {
    const data = breadcrumbJsonLd(product(), SITE);
    expect(data.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Single origin",
        item: `${SITE}/categories/single-origin`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Ethiopia Yirgacheffe",
        item: `${SITE}/products/ethiopia-yirgacheffe`,
      },
    ]);
  });
});

describe("siteJsonLd", () => {
  it("includes a search action pointing at /search", () => {
    const [, website] = siteJsonLd(SITE);
    expect(JSON.stringify(website)).toContain(`${SITE}/search?q={q}`);
  });
});

describe("helpers", () => {
  it("builds absolute URLs with or without a trailing slash", () => {
    expect(absoluteUrl("https://a.example", "/x")).toBe("https://a.example/x");
    expect(absoluteUrl("https://a.example/", "/x")).toBe("https://a.example/x");
  });

  it("formats cents as a decimal price", () => {
    expect(centsToPrice(5)).toBe("0.05");
    expect(centsToPrice(1999)).toBe("19.99");
  });

  it("escapes < so text can never close the script tag", () => {
    const html = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(html).not.toContain("<");
    expect(JSON.parse(html)).toEqual({ name: "</script><script>alert(1)</script>" });
  });
});
