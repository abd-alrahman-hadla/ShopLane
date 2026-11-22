import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Drives Stripe's hosted Checkout page in test mode. Every Stripe selector
 * lives here, so a Checkout UI change is fixed in one place.
 */
export const TEST_CARD = {
  number: "4242 4242 4242 4242",
  expiry: "12 / 34",
  cvc: "123",
} as const;

export const TEST_SHIPPING = {
  name: "Casey Tester",
  line1: "1 Market Street",
  city: "San Francisco",
  postalCode: "94105",
  state: "CA",
} as const;

/** True when the page shows this field (Checkout hides fields depending on the session). */
async function present(locator: Locator): Promise<boolean> {
  return (await locator.count()) > 0 && (await locator.first().isVisible());
}

async function fillIfPresent(page: Page, selector: string, value: string): Promise<void> {
  const field = page.locator(selector);
  if (await present(field)) await field.first().fill(value);
}

export async function payWithTestCard(page: Page, email: string): Promise<void> {
  await page.waitForURL(/^https:\/\/checkout\.stripe\.com\//, { timeout: 60_000 });
  await expect(
    page.locator("#cardNumber, [data-testid='card-accordion-item-button']").first(),
  ).toBeVisible({ timeout: 30_000 });

  // Prefilled (and read-only) when the order has an email.
  const emailField = page.locator("#email");
  if ((await present(emailField)) && (await emailField.isEditable())) await emailField.fill(email);

  // Shipping address (US only). Autocomplete can hide the line fields behind a button.
  const manual = page.getByRole("button", { name: /enter address manually/i });
  if (await present(manual)) await manual.click();
  await fillIfPresent(page, "#shippingName", TEST_SHIPPING.name);
  await fillIfPresent(page, "#shippingAddressLine1", TEST_SHIPPING.line1);
  await fillIfPresent(page, "#shippingLocality", TEST_SHIPPING.city);
  await fillIfPresent(page, "#shippingPostalCode", TEST_SHIPPING.postalCode);
  const state = page.locator("#shippingAdministrativeArea");
  if (await present(state)) await state.selectOption(TEST_SHIPPING.state);

  // With several payment methods enabled, the card form sits in an accordion.
  const cardAccordion = page.locator("[data-testid='card-accordion-item-button']");
  if (await present(cardAccordion)) await cardAccordion.click();

  await page.locator("#cardNumber").fill(TEST_CARD.number);
  await page.locator("#cardExpiry").fill(TEST_CARD.expiry);
  await page.locator("#cardCvc").fill(TEST_CARD.cvc);
  await fillIfPresent(page, "#billingName", TEST_SHIPPING.name);

  // Don't opt into saving details with Link (it would ask for a phone number).
  const saveWithLink = page.locator("#enableStripePass");
  if ((await present(saveWithLink)) && (await saveWithLink.isChecked())) {
    await saveWithLink.uncheck();
  }

  await page.locator("[data-testid='hosted-payment-submit-button']").click();
}
