import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { ADMIN_STORAGE_STATE, STORAGE_STATE } from "./support/auth";

/**
 * axe-core WCAG 2.2 AA scan of the key pages. Fails on serious or critical
 * violations; every violation (including minor ones) is attached to the report.
 */
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function expectAccessible(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  await testInfo.attach(`axe-${name}.json`, {
    body: JSON.stringify(results.violations, null, 2),
    contentType: "application/json",
  });
  const blocking = results.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map(
      (violation) =>
        `${violation.id} (${violation.impact}): ${violation.help} → ` +
        violation.nodes
          .slice(0, 3)
          .map((node) => node.target.join(" "))
          .join(" | "),
    );
  expect(blocking, `axe violations on ${name}`).toEqual([]);
}

const formatOrderNumber = (n: number) => `SL-${String(n).padStart(4, "0")}`;

test.describe("storefront", () => {
  test("home", async ({ page }, testInfo) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectAccessible(page, testInfo, "home");
  });

  test("category with filters applied", async ({ page }, testInfo) => {
    await page.goto("/categories/single-origin?inStock=1&sort=price-asc");
    await expect(page.getByRole("main").getByTestId("result-summary")).toBeVisible();
    await expectAccessible(page, testInfo, "category");
  });

  test("product page", async ({ page }, testInfo) => {
    await page.goto("/products/ethiopia-yirgacheffe-kochere");
    await expect(page.getByRole("button", { name: "Add to cart" })).toBeEnabled();
    await expectAccessible(page, testInfo, "product");
  });

  test("open cart drawer", async ({ page }, testInfo) => {
    await page.goto("/products/stoneware-mug");
    await page.getByRole("button", { name: "Add to cart" }).click();
    const drawer = page.getByTestId("cart-drawer");
    await expect(drawer.getByRole("button", { name: "Checkout" })).toBeVisible();
    await expectAccessible(page, testInfo, "cart-drawer");
  });

  test("sign-in", async ({ page }, testInfo) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expectAccessible(page, testInfo, "sign-in");
  });
});

test.describe("Arabic (right to left)", () => {
  test("home", async ({ page }, testInfo) => {
    await page.goto("/ar");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectAccessible(page, testInfo, "ar-home");
  });

  test("product page", async ({ page }, testInfo) => {
    await page.goto("/ar/products/ethiopia-yirgacheffe-kochere");
    await expect(page.getByRole("button", { name: "أضف إلى السلة" })).toBeEnabled();
    await expectAccessible(page, testInfo, "ar-product");
  });

  test("open cart drawer", async ({ page }, testInfo) => {
    await page.goto("/ar/products/stoneware-mug");
    await page.getByRole("button", { name: "أضف إلى السلة" }).click();
    await expect(
      page.getByTestId("cart-drawer").getByRole("button", { name: "إتمام الشراء" }),
    ).toBeVisible();
    await expectAccessible(page, testInfo, "ar-cart-drawer");
  });
});

test.describe("dark theme", () => {
  test.use({ colorScheme: "dark" });

  test("home", async ({ page }, testInfo) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectAccessible(page, testInfo, "dark-home");
  });

  test("category with filters applied", async ({ page }, testInfo) => {
    await page.goto("/categories/single-origin?inStock=1&sort=price-asc");
    await expect(page.getByRole("main").getByTestId("result-summary")).toBeVisible();
    await expectAccessible(page, testInfo, "dark-category");
  });

  test("product page in Arabic", async ({ page }, testInfo) => {
    await page.goto("/ar/products/ethiopia-yirgacheffe-kochere");
    await expect(page.getByRole("button", { name: "أضف إلى السلة" })).toBeEnabled();
    await expectAccessible(page, testInfo, "dark-ar-product");
  });
});

test.describe("account", () => {
  test.use({ storageState: STORAGE_STATE });

  test("orders", async ({ page }, testInfo) => {
    await page.goto("/account/orders");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectAccessible(page, testInfo, "account-orders");
  });

  test("addresses", async ({ page }, testInfo) => {
    await page.goto("/account/addresses");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectAccessible(page, testInfo, "account-addresses");
  });
});

test.describe("admin", () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });
  test.skip(({ isMobile }) => isMobile, "The admin is a desktop tool");

  test("dashboard", async ({ page }, testInfo) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    await expectAccessible(page, testInfo, "admin-dashboard");
  });

  test("dashboard in Arabic, dark", async ({ browser }, testInfo) => {
    const context = await browser.newContext({
      storageState: ADMIN_STORAGE_STATE,
      colorScheme: "dark",
      baseURL: testInfo.project.use.baseURL,
    });
    const page = await context.newPage();
    await page.goto("/ar/admin");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectAccessible(page, testInfo, "admin-dashboard-ar-dark");
    await context.close();
  });

  test("product editor", async ({ page }, testInfo) => {
    await page.goto("/admin/products?q=stoneware");
    await page.getByRole("main").getByRole("link", { name: "Stoneware Mug" }).click();
    await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Stoneware Mug");
    await expectAccessible(page, testInfo, "admin-product-editor");
  });

  test("order detail", async ({ page }, testInfo) => {
    const number = formatOrderNumber(Number(process.env.E2E_ORDER_NUMBER));
    await page.goto(`/admin/orders?q=${number}`);
    await page.getByRole("main").getByRole("link", { name: number }).click();
    await expect(page.getByRole("heading", { level: 1, name: `Order ${number}` })).toBeVisible();
    await expectAccessible(page, testInfo, "admin-order");
  });
});
