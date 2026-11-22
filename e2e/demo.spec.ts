import { expect, test } from "@playwright/test";

/** One-click demo sign-in (only when the server runs with DEMO_MODE=true, as CI and the demo deploy do). */
test.skip(process.env.DEMO_MODE !== "true", "Demo mode is off");
test.skip(({ isMobile }) => isMobile, "Same flow on every device");

test("Demo admin opens the dashboard, signed in", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByTestId("demo-sign-in").getByRole("button", { name: "Demo admin" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("banner")).toContainText("demo-admin@shoplane.dev");
});

test("Demo customer opens their order history, signed in", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByTestId("demo-sign-in").getByRole("button", { name: "Demo customer" }).click();
  await expect(page).toHaveURL(/\/account\/orders$/);
  await expect(
    page
      .getByRole("main")
      .getByRole("link", { name: /SL-\d+/ })
      .first(),
  ).toBeVisible();
  // The header picks up the session after the full-page redirect.
  await expect(page.getByRole("link", { name: "Account" })).toBeVisible();
});

test("Admin header: reset dialog explains itself, and Sign out ends the session", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await page.getByTestId("demo-sign-in").getByRole("button", { name: "Demo admin" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  // Open and cancel only: a real reset would archive products other specs create in parallel.
  await page.getByRole("button", { name: "Reset demo data" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Reset the demo data?" });
  await expect(dialog).toContainText("Orders stay");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/sign-in\?callbackUrl=%2Fadmin/);
});
