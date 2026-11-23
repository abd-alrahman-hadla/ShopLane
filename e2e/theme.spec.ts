import { expect, test, type Page } from "@playwright/test";

/** Light, dark and system themes from the account menu (next-themes, class on <html>). */

async function chooseTheme(page: Page, theme: "light" | "dark" | "system"): Promise<void> {
  await page.getByTestId("account-menu").click();
  await page.getByTestId(`theme-${theme}`).click();
}

const html = (page: Page) => page.locator("html");

test("follows the system setting by default", async ({ browser }) => {
  for (const colorScheme of ["light", "dark"] as const) {
    const context = await browser.newContext({ colorScheme });
    const page = await context.newPage();
    await page.goto("/");
    if (colorScheme === "dark") await expect(html(page)).toHaveClass(/\bdark\b/);
    else await expect(html(page)).not.toHaveClass(/\bdark\b/);
    await context.close();
  }
});

test("a chosen theme overrides the system and survives reloads", async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: "light" });
  const page = await context.newPage();
  await page.goto("/");

  await chooseTheme(page, "dark");
  await expect(html(page)).toHaveClass(/\bdark\b/);
  await page.reload();
  await expect(html(page)).toHaveClass(/\bdark\b/);
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(background).not.toBe("rgb(255, 255, 255)");

  await chooseTheme(page, "light");
  await expect(html(page)).not.toHaveClass(/\bdark\b/);
  await page.reload();
  await expect(html(page)).not.toHaveClass(/\bdark\b/);
  await context.close();
});

test("the theme applies before paint (no flash) on a fresh load", async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: "dark" });
  const page = await context.newPage();
  // Read the class as soon as the document exists, before hydration.
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      (window as unknown as { __earlyDark: boolean }).__earlyDark =
        document.documentElement.classList.contains("dark");
    });
  });
  await page.goto("/");
  expect(
    await page.evaluate(() => (window as unknown as { __earlyDark: boolean }).__earlyDark),
  ).toBe(true);
  await context.close();
});
