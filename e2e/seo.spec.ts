import { expect, test } from "@playwright/test";

/** What crawlers see: sitemap, robots.txt, canonical/OG tags and Product JSON-LD. */
test.skip(({ isMobile }) => isMobile, "Markup is the same on every device");

test("sitemap lists categories and active products, but no drafts", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.ok()).toBe(true);
  const xml = await response.text();
  expect(xml).toContain("/categories/single-origin</loc>");
  expect(xml).toContain("/products/ethiopia-yirgacheffe-kochere</loc>");
  expect(xml).not.toContain("/products/e2e-");
  expect(xml).not.toContain("/admin");
});

test("robots.txt keeps crawlers out of private areas and points to the sitemap", async ({
  request,
}) => {
  const body = await (await request.get("/robots.txt")).text();
  expect(body).toContain("Disallow: /admin");
  expect(body).toContain("Disallow: /account");
  expect(body).toContain("Disallow: /checkout");
  expect(body).toMatch(/Sitemap: https?:\/\/[^\s]+\/sitemap\.xml/);
});

test("product page has canonical, Open Graph image and Product JSON-LD with offers", async ({
  page,
  request,
}) => {
  await page.goto("/products/ethiopia-yirgacheffe-kochere?variant=anything");

  const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
  expect(canonical).toMatch(/\/products\/ethiopia-yirgacheffe-kochere$/);

  const ogImage = await page.locator('meta[property="og:image"]').first().getAttribute("content");
  expect(ogImage).toContain("/products/ethiopia-yirgacheffe-kochere/opengraph-image");
  const image = await request.get(new URL(ogImage!).pathname + new URL(ogImage!).search);
  expect(image.headers()["content-type"]).toBe("image/png");

  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const graph = blocks.flatMap((text) => JSON.parse(text) as unknown[]) as Array<
    Record<string, unknown>
  >;
  const product = graph.find((node) => node["@type"] === "Product");
  expect(product).toBeDefined();
  const offers = product!.offers as Array<Record<string, string>>;
  expect(offers.length).toBeGreaterThan(0);
  for (const offer of offers) {
    expect(offer.price).toMatch(/^\d+\.\d{2}$/);
    expect(offer.priceCurrency).toBe("USD");
    expect(offer.availability).toMatch(/^https:\/\/schema\.org\/(InStock|OutOfStock)$/);
  }
  expect(graph.some((node) => node["@type"] === "BreadcrumbList")).toBe(true);
});

test("private pages are noindex", async ({ page }) => {
  await page.goto("/cart");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});
