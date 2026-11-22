import { expect, test } from "@playwright/test";
import { ADMIN_STORAGE_STATE, E2E_USER_EMAIL, STORAGE_STATE } from "./support/auth";
import { payWithTestCard } from "./support/stripe-checkout";

/**
 * The whole purchase, end to end, with a real Stripe test-mode payment:
 * browse → cart → coupon → Stripe Checkout (4242…) → webhook marks it paid →
 * the order shows up in the customer's account and in the admin.
 *
 * Needs a real sk_test_ key and webhooks forwarded to the e2e server:
 *   stripe listen --forward-to localhost:3100/api/webhooks/stripe
 * with STRIPE_WEBHOOK_SECRET set to that listener's secret. CI does both;
 * locally set E2E_STRIPE=1 once the listener is running.
 */
const hasStripe =
  /^sk_test_[A-Za-z0-9]{20,}$/.test(process.env.STRIPE_SECRET_KEY ?? "") &&
  (process.env.CI === "true" || process.env.E2E_STRIPE === "1");

test.describe("purchase with a Stripe test card", () => {
  test.skip(!hasStripe, "Needs a Stripe test key and `stripe listen` (see the spec header)");
  test.skip(({ isMobile }) => isMobile, "One real payment per run is enough");
  test.use({ storageState: STORAGE_STATE });
  test.setTimeout(180_000);

  test("browse → cart → coupon → pay → order in account and admin", async ({ page, browser }) => {
    // Browse: home → category → product.
    await page.goto("/");
    await page
      .getByTestId("category-tiles")
      .getByRole("link", { name: /Cups & Accessories/ })
      .click();
    await expect(page).toHaveURL(/\/categories\/cups-accessories/);
    await page.getByRole("main").getByRole("link", { name: "Cone Paper Filters" }).first().click();
    await expect(page.getByRole("heading", { level: 1, name: "Cone Paper Filters" })).toBeVisible();

    // Cart + coupon.
    await page.getByRole("button", { name: "Add to cart" }).click();
    const drawer = page.getByTestId("cart-drawer");
    await expect(drawer.getByTestId("cart-line")).toHaveCount(1);
    await drawer.getByLabel("Discount code").fill("WELCOME10");
    await drawer.getByRole("button", { name: "Apply" }).click();
    await expect(drawer.getByTestId("applied-coupon")).toHaveText("WELCOME10");
    await expect(drawer.getByTestId("cart-discount")).toHaveText(/^−\$/);
    const total = (await drawer.getByTestId("cart-total").textContent())?.trim() ?? "";
    expect(total).toMatch(/^\$\d+\.\d{2}$/);

    // Pay on Stripe's hosted page.
    await drawer.getByRole("button", { name: "Checkout" }).click();
    await payWithTestCard(page, E2E_USER_EMAIL);

    // Back on the store: the webhook flips the order to PAID (the page polls).
    await page.waitForURL(/\/checkout\/success\?session_id=cs_test_/, { timeout: 60_000 });
    const heading = page.getByRole("heading", { level: 1, name: /Thank you! Order SL-\d+/ });
    await expect(heading).toBeVisible({ timeout: 60_000 });
    const number = (await heading.textContent())?.match(/SL-\d+/)?.[0];
    expect(number).toBeTruthy();
    await expect(page.getByRole("main")).toContainText(total);

    // Customer account.
    await page.goto("/account/orders");
    const row = page.getByRole("main").getByRole("link", { name: number! });
    await expect(row).toBeVisible();
    await row.click();
    await expect(page.getByRole("main")).toContainText("Paid");
    await expect(page.getByRole("main")).toContainText("WELCOME10");
    await expect(page.getByRole("main")).toContainText(total);

    // Admin.
    const admin = await browser.newContext({ storageState: ADMIN_STORAGE_STATE });
    try {
      const adminPage = await admin.newPage();
      await adminPage.goto(`/admin/orders?q=${number}`);
      const adminRow = adminPage.getByRole("main").getByRole("row").filter({ hasText: number! });
      await expect(adminRow).toContainText(total);
      await adminRow.getByRole("link", { name: number! }).click();
      await expect(
        adminPage.getByRole("heading", { level: 1, name: `Order ${number}` }),
      ).toBeVisible();
      await expect(adminPage.getByRole("main")).toContainText("WELCOME10");
      await expect(adminPage.getByRole("main")).toContainText("Paid");
    } finally {
      await admin.close();
    }
  });
});
