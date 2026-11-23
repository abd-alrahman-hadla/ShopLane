import { expect, test } from "@playwright/test";
import { ADMIN_STORAGE_STATE } from "./support/auth";

/** English at /, Arabic under /ar: switching, right-to-left layout, translated catalog. */

test("switching to Arabic keeps the page and lays it out right to left", async ({ page }) => {
  await page.goto("/products/ethiopia-yirgacheffe-kochere");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

  await page.getByTestId("account-menu").click();
  await page.getByRole("menuitem", { name: "العربية" }).click();

  await expect(page).toHaveURL(/\/ar\/products\/ethiopia-yirgacheffe-kochere$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { level: 1 })).toHaveText("إثيوبيا يرغاتشيفي كوتشيري");
  await expect(main.getByRole("button", { name: "أضف إلى السلة" })).toBeEnabled();
});

test("the chosen language is remembered for unprefixed links", async ({ page }) => {
  await page.goto("/ar");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await page.goto("/products");
  await expect(page).toHaveURL(/\/ar\/products$/);
});

test("Arabic search finds products by their Arabic name", async ({ page }) => {
  await page.goto(`/ar/search?q=${encodeURIComponent("إثيوبيا")}`);
  await expect(
    page
      .getByRole("main")
      .getByRole("link", { name: /إثيوبيا يرغاتشيفي كوتشيري/ })
      .first(),
  ).toBeVisible();
});

test("the cart drawer opens from the left with its close button on the left", async ({ page }) => {
  await page.goto("/ar/products/stoneware-mug");
  await page.getByRole("main").getByRole("button", { name: "أضف إلى السلة" }).click();
  const drawer = page.getByTestId("cart-drawer");
  await expect(drawer.getByRole("button", { name: "إتمام الشراء" })).toBeVisible();

  const viewport = page.viewportSize()!;
  const panel = (await drawer.boundingBox())!;
  expect(panel.x).toBeLessThan(viewport.width / 4);
  const close = (await drawer.locator('[data-slot="sheet-close"]').boundingBox())!;
  expect(close.x + close.width / 2).toBeLessThan(panel.x + panel.width / 2);
});

test("English stays unprefixed and left to right", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
});

test("Arabic prices show a plain $ sign", async ({ page }) => {
  await page.goto("/ar/products/ethiopia-yirgacheffe-kochere");
  const main = page.getByRole("main");
  await expect(main.getByRole("button", { name: "أضف إلى السلة" })).toBeEnabled();
  await expect(main).toContainText("$");
  await expect(main).not.toContainText("US$");
});

test.describe("Arabic admin", () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });
  test.skip(({ isMobile }) => isMobile, "The admin is a desktop tool");

  test("lists and finds products by their Arabic names", async ({ page }) => {
    await page.goto(`/ar/admin/products?q=${encodeURIComponent("إثيوبيا")}`);
    await expect(
      page.getByRole("main").getByRole("link", { name: "إثيوبيا يرغاتشيفي كوتشيري" }),
    ).toBeVisible();
    await page.goto("/ar/admin");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("banner")).not.toContainText("الإدارة");
  });
});
