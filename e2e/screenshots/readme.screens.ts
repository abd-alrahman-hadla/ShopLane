import { expect, test, type Page } from "@playwright/test";
import { ADMIN_STORAGE_STATE, STORAGE_STATE } from "../support/auth";

/**
 * README screenshots → docs/screenshots/*.png. Run on demand:
 *   npm run screenshots
 */
const OUT = "docs/screenshots";

async function shoot(page: Page, name: string): Promise<void> {
  // Let images finish decoding and animations settle.
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

test.describe("storefront", () => {
  test("home", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await shoot(page, "home");
  });

  test("category with filters", async ({ page }) => {
    await page.goto("/categories/single-origin?inStock=1&sort=price-asc");
    await expect(page.getByRole("main").getByTestId("result-summary")).toBeVisible();
    await shoot(page, "category");
  });

  test("product", async ({ page }) => {
    await page.goto("/products/ethiopia-yirgacheffe-kochere");
    await expect(page.getByRole("button", { name: "Add to cart" })).toBeEnabled();
    await shoot(page, "product");
  });

  test("cart drawer with coupon", async ({ page }) => {
    await page.goto("/products/stoneware-mug");
    await page.getByRole("button", { name: "Add to cart" }).click();
    const drawer = page.getByTestId("cart-drawer");
    await drawer.getByLabel("Discount code").fill("WELCOME10");
    await drawer.getByRole("button", { name: "Apply" }).click();
    await expect(drawer.getByTestId("applied-coupon")).toHaveText("WELCOME10");
    await shoot(page, "cart");
  });
});

test.describe("account", () => {
  test.use({ storageState: STORAGE_STATE });

  test("order detail", async ({ page }) => {
    await page.goto("/account/orders");
    await page.getByRole("main").getByRole("link", { name: /SL-\d+/ }).first().click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await shoot(page, "account-order");
  });
});

test.describe("admin", () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test("dashboard", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    await shoot(page, "admin-dashboard");
  });

  test("orders", async ({ page }) => {
    await page.goto("/admin/orders");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await shoot(page, "admin-orders");
  });

  test("product editor", async ({ page }) => {
    await page.goto("/admin/products?q=stoneware");
    await page.getByRole("main").getByRole("link", { name: "Stoneware Mug" }).click();
    await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Stoneware Mug");
    await shoot(page, "admin-product");
  });
});
