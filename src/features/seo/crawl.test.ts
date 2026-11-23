import { describe, expect, it } from "vitest";
import { buildRobots, buildSitemap, localizedPath } from "./crawl";

const SITE = "https://shoplane.example";

describe("localizedPath", () => {
  it("prefixes every language but English", () => {
    expect(localizedPath("/products", "en")).toBe("/products");
    expect(localizedPath("/products", "ar")).toBe("/ar/products");
    expect(localizedPath("/", "en")).toBe("/");
    expect(localizedPath("/", "ar")).toBe("/ar");
  });
});

describe("buildRobots", () => {
  it("allows the store but blocks private areas in every language in production", () => {
    const robots = buildRobots(SITE, true);
    expect(robots.rules).toEqual({
      userAgent: "*",
      allow: "/",
      disallow: expect.arrayContaining([
        "/admin",
        "/account",
        "/cart",
        "/checkout",
        "/api/",
        "/ar/admin",
        "/ar/account",
        "/ar/cart",
        "/ar/checkout",
        "/ar/sign-in",
        "/ar/search",
      ]),
    });
    expect(robots.rules).not.toEqual(
      expect.objectContaining({ disallow: expect.arrayContaining(["/ar/api/"]) }),
    );
    expect(robots.sitemap).toBe(`${SITE}/sitemap.xml`);
  });

  it("blocks everything outside production (previews, local builds)", () => {
    expect(buildRobots(SITE, false).rules).toEqual({ userAgent: "*", disallow: "/" });
  });
});

describe("buildSitemap", () => {
  const records = [
    { path: "/categories/single-origin", updatedAt: "2026-11-01T00:00:00.000Z" },
    { path: "/products/ethiopia", updatedAt: "2026-11-20T00:00:00.000Z" },
  ];

  it("lists home, /products, then every catalog URL, once per language", () => {
    expect(buildSitemap(SITE, records).map((entry) => entry.url)).toEqual([
      `${SITE}/`,
      `${SITE}/products`,
      `${SITE}/categories/single-origin`,
      `${SITE}/products/ethiopia`,
      `${SITE}/ar`,
      `${SITE}/ar/products`,
      `${SITE}/ar/categories/single-origin`,
      `${SITE}/ar/products/ethiopia`,
    ]);
  });

  it("links each entry to every language with an English x-default", () => {
    const entries = buildSitemap(SITE, records);
    const english = entries.find((entry) => entry.url === `${SITE}/products/ethiopia`);
    const arabic = entries.find((entry) => entry.url === `${SITE}/ar/products/ethiopia`);
    const languages = {
      en: `${SITE}/products/ethiopia`,
      ar: `${SITE}/ar/products/ethiopia`,
      "x-default": `${SITE}/products/ethiopia`,
    };
    expect(english?.alternates?.languages).toEqual(languages);
    expect(arabic?.alternates?.languages).toEqual(languages);
  });

  it("dates home and /products by the newest catalog change", () => {
    const [home, products, category] = buildSitemap(SITE, records);
    expect(home?.lastModified).toEqual(new Date("2026-11-20T00:00:00.000Z"));
    expect(products?.lastModified).toEqual(new Date("2026-11-20T00:00:00.000Z"));
    expect(category?.lastModified).toEqual(new Date("2026-11-01T00:00:00.000Z"));
  });

  it("still lists the two landing pages in each language with an empty catalog", () => {
    expect(buildSitemap(SITE, [])).toHaveLength(4);
  });
});
