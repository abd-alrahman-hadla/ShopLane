import { expect, test, type Page } from "@playwright/test";

/**
 * Catalog flows against the seeded dev database (`npm run db:seed`).
 * Desktop-only interactions use the sidebar; the mobile project covers the sheet.
 */

async function productNames(page: Page): Promise<string[]> {
  return page.getByTestId("product-name").allTextContents();
}

async function cardPrices(page: Page): Promise<number[]> {
  const texts = await page.getByTestId("product-card").getByTestId("price").allTextContents();
  return texts.map((text) => Number(text.replace(/[^0-9.]/g, "")));
}

test("home shows featured products and five categories", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Featured" })).toBeVisible();
  await expect(page.getByTestId("product-grid").getByTestId("product-card")).toHaveCount(8);
  await expect(page.getByTestId("category-tiles").getByRole("link")).toHaveCount(5);
});

test.describe("filters (desktop)", () => {
  test.skip(({ isMobile }) => isMobile, "Sidebar filters are desktop-only");

  test("filtering a category updates the URL and the shared link reproduces it", async ({
    page,
    context,
  }) => {
    await page.goto("/categories/single-origin");
    await expect(page.getByTestId("result-summary")).toHaveText("7 products");

    const sidebar = page.getByRole("complementary", { name: "Filters" });
    await sidebar.getByLabel("1 kg").check();
    await expect(page).toHaveURL(/\/categories\/single-origin\?size=1\+kg$/);
    await sidebar.getByLabel("In stock only").check();
    await expect(page).toHaveURL(/inStock=1&size=1\+kg/);

    // Sumatra and Rwanda have no 1 kg bags in stock.
    const names = await productNames(page);
    expect(names).not.toContain("Sumatra Gayo");
    expect(names).not.toContain("Rwanda Nyamasheke");
    expect(names.length).toBe(5);

    const shared = await context.newPage();
    await shared.goto(page.url());
    expect(await productNames(shared)).toEqual(names);
  });

  test("sorting by price ascending orders the grid", async ({ page }) => {
    await page.goto("/products?sort=price-asc");
    const prices = await cardPrices(page);
    expect(prices.length).toBeGreaterThan(1);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
  });

  test("changing sort through the select keeps other filters", async ({ page }) => {
    await page.goto("/categories/brewers?inStock=1");
    await page.getByRole("combobox", { name: "Sort products" }).click();
    await page.getByRole("option", { name: "Price: high to low" }).click();
    await expect(page).toHaveURL(/\/categories\/brewers\?inStock=1&sort=price-desc$/);
  });
});

test("pagination links to a different page of results", async ({ page }) => {
  await page.goto("/products");
  await expect(page.getByTestId("result-summary")).toContainText("38 products");
  const firstPage = await productNames(page);

  await page.getByRole("link", { name: "Page 2" }).click();
  await expect(page).toHaveURL(/\/products\?page=2$/);
  const secondPage = await productNames(page);
  expect(secondPage.length).toBeGreaterThan(0);
  expect(secondPage.some((name) => firstPage.includes(name))).toBe(false);
});

test("picking a variant updates price and URL, and survives a reload", async ({ page }) => {
  await page.goto("/products/stoneware-mug");
  await expect(page.getByTestId("selected-sku")).toHaveText("SKU CA-STM-08-WHT");

  await page.getByRole("button", { name: "Size 12 oz" }).click();
  await expect(page).toHaveURL(/variant=CA-STM-12-WHT/);
  await expect(page.locator("main").getByTestId("price").first()).toHaveText("$24.00");

  await page.reload();
  await expect(page.getByTestId("selected-sku")).toHaveText("SKU CA-STM-12-WHT");
  await expect(page.getByRole("button", { name: "Size 12 oz" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("search finds kettles and never shows drafts", async ({ page }) => {
  await page.goto("/search?q=kettle");
  const names = await productNames(page);
  expect(names.length).toBeGreaterThan(0);
  for (const name of names) expect(name.toLowerCase()).toContain("kettle");

  await page.goto("/search?q=geisha");
  await expect(page.getByText("No products match these filters.")).toBeVisible();

  const response = await page.goto("/products/panama-boquete-geisha");
  expect(response?.status()).toBe(404);
});

test("mobile filter sheet applies a filter", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile only");
  await page.goto("/categories/cups-accessories");
  await page.getByRole("button", { name: /Filters/ }).click();
  await page.getByRole("dialog").getByLabel("Sage").check();
  await expect(page).toHaveURL(/color=Sage/);
});
