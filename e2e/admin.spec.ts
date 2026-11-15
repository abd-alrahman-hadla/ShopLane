import { expect, test } from "@playwright/test";
import { ADMIN_STORAGE_STATE, STORAGE_STATE } from "./support/auth";

const formatOrderNumber = (n: number) => `SL-${String(n).padStart(4, "0")}`;
const IMAGE_URL =
  "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1200&q=80";

test.describe("access control", () => {
  test("signed-out visitors are sent to sign-in", async ({ page }) => {
    await page.goto("/admin/products");
    await expect(page).toHaveURL(/\/sign-in\?callbackUrl=%2Fadmin/);
  });

  test.describe("as a customer", () => {
    test.use({ storageState: STORAGE_STATE });
    test("admin pages return 404", async ({ page }) => {
      const response = await page.goto("/admin");
      expect(response?.status()).toBe(404);
    });
  });
});

test.describe("as an admin", () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });
  // One shared admin and dev database: run in order, on desktop only.
  test.describe.configure({ mode: "serial" });
  test.skip(({ isMobile }) => isMobile, "Shares one admin user; runs on desktop only");

  test("dashboard shows key figures, the revenue chart and top products", async ({ page }) => {
    await page.goto("/admin");
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(main.getByTestId("stat-tile")).toHaveCount(5);
    await expect(
      main.getByRole("img", { name: /Daily revenue for the last 30 days/ }),
    ).toBeVisible();
    // The e2e fixture order (paid just now) makes Cone Paper Filters a top product.
    await expect(main.getByTestId("top-products")).toContainText("Cone Paper Filters");
  });

  test("create a draft product, publish it, then archive it", async ({ page }) => {
    // Eight navigations, several of them uncached renders against a remote database.
    test.setTimeout(90_000);
    await page.goto("/admin/products/new");
    const form = page.getByTestId("product-form");
    await form.getByLabel("Name").fill("E2E Pour Over Stand");
    await expect(form.getByLabel("URL slug")).toHaveValue("e2e-pour-over-stand");
    await form
      .getByLabel("Description", { exact: true })
      .fill("A walnut stand for pour-over brewing, made for tests.");
    await form.getByLabel("SKU, variant 1").fill("E2E-POS-1");
    await form.getByLabel("Title, variant 1").fill("Walnut");
    await form.getByLabel("Price ($), variant 1").fill("24.00");
    await form.getByLabel("Stock, variant 1").fill("5");
    await form.getByLabel("Image URL").fill(IMAGE_URL);
    await form.getByRole("button", { name: "Add", exact: true }).click();
    await form.getByLabel("Alt text for image 1").fill("Pour-over stand");
    await form.getByRole("button", { name: "Create product" }).click();

    await expect(page).toHaveURL(/\/admin\/products\/[^/]+\?created=1$/);
    await expect(
      page.getByRole("status").filter({ hasText: "Product created as a draft" }),
    ).toBeVisible();
    const editUrl = page.url().replace("?created=1", "");

    // Drafts are not in the store.
    expect((await page.goto("/products/e2e-pour-over-stand"))?.status()).toBe(404);

    await page.goto(editUrl);
    await page.getByLabel("Status").selectOption("ACTIVE");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
    await expect(page.getByTestId("audit-history")).toContainText("Updated E2E Pour Over Stand");

    const live = await page.goto("/products/e2e-pour-over-stand");
    expect(live?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { level: 1, name: "E2E Pour Over Stand" }),
    ).toBeVisible();

    await page.goto(editUrl);
    await page.getByRole("button", { name: "Archive" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Archive product" }).click();
    await expect(
      page.getByText("This product is archived and hidden from the store."),
    ).toBeVisible();
    expect((await page.goto("/products/e2e-pour-over-stand"))?.status()).toBe(404);
  });

  test("ship the fixture order with tracking", async ({ page }) => {
    const number = formatOrderNumber(Number(process.env.E2E_ORDER_NUMBER));
    await page.goto(`/admin/orders?q=${number}`);
    await page.getByRole("main").getByRole("link", { name: number }).click();
    await expect(page.getByRole("heading", { level: 1, name: `Order ${number}` })).toBeVisible();

    const ship = page.getByTestId("ship-form");
    await ship.getByLabel("Carrier").selectOption("USPS");
    await ship.getByLabel("Tracking number").fill("9400100000000000000001");
    await ship.getByRole("button", { name: "Mark shipped" }).click();
    await expect(ship.getByRole("status")).toContainText("Marked as shipped");

    await page.reload();
    await expect(page.getByTestId("order-status-badge").first()).toHaveText("Shipped");
    await expect(page.getByTestId("audit-history")).toContainText(`Shipped ${number} via USPS`);
  });

  test("create a coupon, then deactivate it", async ({ page }) => {
    await page.goto("/admin/coupons");
    await page.getByRole("button", { name: "New coupon" }).click();
    const dialog = page.getByTestId("coupon-form");
    await dialog.getByLabel("Code").fill("e2e-test10");
    await dialog.getByLabel("Percent").fill("10");
    await dialog.getByRole("button", { name: "Create coupon" }).click();

    const row = page.getByTestId("coupon-row").filter({ hasText: "E2E-TEST10" });
    await expect(row).toContainText("10% off");
    const active = row.getByRole("switch", { name: "E2E-TEST10 active" });
    await expect(active).toHaveAttribute("aria-checked", "true");
    await active.click();
    await expect(active).toHaveAttribute("aria-checked", "false");
    // Disabled while the action runs; leaving earlier would abort it.
    await expect(active).toBeEnabled();

    await page.goto("/admin/audit?type=Coupon");
    await expect(page.getByTestId("audit-log")).toContainText("Deactivated coupon E2E-TEST10");
    await expect(page.getByTestId("audit-log")).toContainText("Created coupon E2E-TEST10");
  });
});
