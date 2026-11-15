import { expect, test } from "@playwright/test";

/**
 * Cart flow against the seeded dev database. Checkout stops at Stripe's
 * hosted page; paying is covered manually (docs/stripe-local-testing.md).
 */

test("add to cart, change quantity and apply a coupon", async ({ page }) => {
  await page.goto("/products/stoneware-mug");
  await page.getByRole("button", { name: "Add to cart" }).click();

  const drawer = page.getByTestId("cart-drawer");
  await expect(drawer).toBeVisible();
  await expect(page.getByTestId("cart-count")).toHaveText("1");
  await expect(drawer.getByTestId("cart-line")).toHaveCount(1);
  await expect(drawer.getByTestId("cart-subtotal")).toHaveText("$22.00");

  await drawer.getByRole("button", { name: /Increase quantity/ }).click();
  await expect(drawer.getByTestId("cart-line-quantity")).toHaveText("2");
  await expect(drawer.getByTestId("cart-subtotal")).toHaveText("$44.00");
  await expect(drawer.getByTestId("cart-shipping")).toHaveText("$6.00");

  await drawer.getByLabel("Discount code").fill("welcome10");
  await drawer.getByRole("button", { name: "Apply" }).click();
  await expect(drawer.getByTestId("applied-coupon")).toHaveText("WELCOME10");
  await expect(drawer.getByTestId("cart-discount")).toHaveText("−$4.40");
  await expect(drawer.getByTestId("cart-total")).toHaveText("$45.60");
});

test("the cart survives a reload", async ({ page }) => {
  await page.goto("/products/cone-paper-filters");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByTestId("cart-count")).toHaveText("1");

  await page.reload();
  await expect(page.getByTestId("cart-count")).toHaveText("1");
});

test("an invalid coupon shows an error", async ({ page }) => {
  await page.goto("/products/cone-paper-filters");
  await page.getByRole("button", { name: "Add to cart" }).click();
  const drawer = page.getByTestId("cart-drawer");
  await drawer.getByLabel("Discount code").fill("NOPE");
  await drawer.getByRole("button", { name: "Apply" }).click();
  await expect(drawer.getByRole("alert")).toContainText("That code isn’t valid.");
});

test("checkout redirects to Stripe", async ({ page }) => {
  test.skip(!process.env.STRIPE_SECRET_KEY, "Needs STRIPE_SECRET_KEY in .env");
  await page.goto("/products/cone-paper-filters");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.getByTestId("cart-drawer").getByRole("button", { name: "Checkout" }).click();
  await page.waitForURL(/^https:\/\/checkout\.stripe\.com\//, { timeout: 30_000 });
});
