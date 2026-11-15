import { expect, test } from "@playwright/test";
import { seedReviews } from "../prisma/seed-data/reviews";
import { STORAGE_STATE } from "./support/auth";

/** Average shown for a product, computed from the seed data the store was seeded with. */
function seededAverage(slug: string): string {
  const ratings = seedReviews
    .filter((review) => review.product === slug)
    .map((review) => review.rating);
  const average = Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 10) / 10;
  return `${average.toFixed(1)} (${ratings.length})`;
}

test.describe("signed out", () => {
  test("account pages redirect to sign-in and come back", async ({ page }) => {
    await page.goto("/account/orders");
    await expect(page).toHaveURL(/\/sign-in\?callbackUrl=%2Faccount/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  test("the wishlist heart asks you to sign in", async ({ page }) => {
    await page.goto("/products/stoneware-mug");
    await page.getByRole("button", { name: "Save to wishlist" }).click();
    await expect(page).toHaveURL(/\/sign-in\?callbackUrl=%2Fproducts%2Fstoneware-mug/);
  });

  test("seeded ratings show on product cards and the product page", async ({ page }) => {
    await page.goto("/");
    const card = page
      .getByRole("main")
      .getByTestId("product-card")
      .filter({ hasText: "Laneway Espresso" });
    await expect(card.getByTestId("rating-summary")).toContainText(
      seededAverage("laneway-espresso"),
    );

    await page.goto("/products/laneway-espresso");
    await expect(page.getByTestId("review-summary")).toContainText(
      seededAverage("laneway-espresso").split(" ")[0] ?? "",
    );
    await expect(page.getByRole("main").getByTestId("review")).toHaveCount(
      seedReviews.filter((review) => review.product === "laneway-espresso").length,
    );
    await expect(page.getByTestId("review-form-status")).toContainText("Sign in");
  });
});

test.describe("signed in", () => {
  test.use({ storageState: STORAGE_STATE });
  // One shared e2e user: run these in order, on desktop only.
  test.describe.configure({ mode: "serial" });
  test.skip(({ isMobile }) => isMobile, "Shares one e2e user; runs on desktop only");

  test("profile name can be updated", async ({ page }) => {
    await page.goto("/account");
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
    await page.getByLabel("Name").fill("Casey Q. Tester");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status")).toHaveText("Saved.");
    await page.reload();
    await expect(page.getByLabel("Name")).toHaveValue("Casey Q. Tester");
  });

  test("orders page shows an empty state for a new customer", async ({ page }) => {
    await page.goto("/account/orders");
    await expect(page.getByText("You haven’t placed any orders yet.")).toBeVisible();
  });

  test("wishlist: save from a product page, then remove from the account", async ({ page }) => {
    await page.goto("/products/hand-burr-grinder");
    const save = page.getByRole("button", { name: "Save to wishlist" });
    await save.click();
    const saved = page.getByRole("button", { name: "Saved" });
    await expect(saved).toHaveAttribute("aria-pressed", "true");
    // The button is disabled while the save is in flight; leaving earlier would abort it.
    await expect(saved).toBeEnabled();

    await page.goto("/account/wishlist");
    const card = page
      .getByRole("main")
      .getByTestId("product-card")
      .filter({ hasText: "Hand Burr Grinder" });
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: "Remove Hand Burr Grinder from wishlist" }).click();
    // The action revalidates the wishlist page, so the card drops out of the list.
    await expect(card).toHaveCount(0);
    await expect(page.getByText("Tap the heart on any product to save it here.")).toBeVisible();

    await page.reload();
    await expect(page.getByText("Tap the heart on any product to save it here.")).toBeVisible();
  });

  test("addresses: add, then delete", async ({ page }) => {
    await page.goto("/account/addresses");
    await page.getByRole("button", { name: "Add address" }).click();
    const form = page.getByTestId("address-form");
    await form.getByLabel("Full name").fill("Casey Tester");
    await form.getByLabel("Address", { exact: true }).fill("500 Pour Over Lane");
    await form.getByLabel("City").fill("Seattle");
    await form.getByLabel("State").selectOption("WA");
    await form.getByLabel("ZIP code").fill("98101");
    await form.getByRole("button", { name: "Add address" }).click();

    const card = page.getByTestId("address-card").filter({ hasText: "500 Pour Over Lane" });
    await expect(card).toContainText("Default");
    await card.getByRole("button", { name: /Delete address/ }).click();
    await expect(page.getByText("No saved addresses yet.")).toBeVisible();
  });

  test("the review form only accepts verified buyers", async ({ page }) => {
    await page.goto("/products/laneway-espresso");
    await expect(page.getByTestId("review-form-status")).toHaveText(
      "Only customers who bought Laneway Espresso can review it.",
    );
  });
});
