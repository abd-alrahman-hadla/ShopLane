import { describe, expect, it } from "vitest";
import { buildRobots, buildSitemap } from "./crawl";

const SITE = "https://shoplane.example";

describe("buildRobots", () => {
  it("allows the store but blocks private areas in production", () => {
    const robots = buildRobots(SITE, true);
    expect(robots.rules).toEqual({
      userAgent: "*",
      allow: "/",
      disallow: expect.arrayContaining(["/admin", "/account", "/cart", "/checkout", "/api/"]),
    });
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

  it("lists home, /products, then every catalog URL as absolute URLs", () => {
    expect(buildSitemap(SITE, records).map((entry) => entry.url)).toEqual([
      `${SITE}/`,
      `${SITE}/products`,
      `${SITE}/categories/single-origin`,
      `${SITE}/products/ethiopia`,
    ]);
  });

  it("dates home and /products by the newest catalog change", () => {
    const [home, products, category] = buildSitemap(SITE, records);
    expect(home?.lastModified).toEqual(new Date("2026-11-20T00:00:00.000Z"));
    expect(products?.lastModified).toEqual(new Date("2026-11-20T00:00:00.000Z"));
    expect(category?.lastModified).toEqual(new Date("2026-11-01T00:00:00.000Z"));
  });

  it("still lists the two landing pages with an empty catalog", () => {
    expect(buildSitemap(SITE, [])).toHaveLength(2);
  });
});
