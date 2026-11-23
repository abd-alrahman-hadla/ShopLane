import { render } from "@react-email/components";
import { describe, expect, it } from "vitest";
import { emailI18n } from "./i18n";
import { OrderConfirmationEmail, orderConfirmationText, type OrderEmailData } from "./order-emails";
import { OrderShippedEmail, orderShippedText } from "./order-shipped";
import { SignInLinkEmail } from "./sign-in-link";

const order: OrderEmailData = {
  number: 42,
  currency: "usd",
  subtotalCents: 3600,
  discountCents: 360,
  shippingCents: 0,
  taxCents: 0,
  totalCents: 3240,
  couponCode: "WELCOME10",
  items: [{ productName: "Kochere", variantTitle: "250g", quantity: 2, lineTotalCents: 3600 }],
};

describe("order emails", () => {
  it("renders English left to right", async () => {
    const i18n = emailI18n("en");
    const html = await render(
      OrderConfirmationEmail({ order, siteUrl: "https://shop.test", i18n }),
    );
    expect(html).toContain('lang="en"');
    expect(html).toContain('dir="ltr"');
    expect(html).toContain("Thanks for your order!");
    expect(html).toContain("$32.40");
    expect(orderConfirmationText(order, i18n)).toContain("Discount  −$3.60");
  });

  it("renders Arabic right to left with Latin digits", async () => {
    const i18n = emailI18n("ar");
    const html = await render(
      OrderConfirmationEmail({ order, siteUrl: "https://shop.test", i18n }),
    );
    expect(html).toContain('lang="ar"');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("شكرًا لطلبك!");
    expect(html).toContain("32.40");
    expect(html).not.toContain("Thanks for your order");
  });

  it("translates the shipping notice", async () => {
    const data = {
      number: 7,
      carrier: "UPS",
      trackingNumber: "1Z999AA1",
      trackingUrl: null,
      items: [{ productName: "Kettle", variantTitle: "Black", quantity: 1 }],
    };
    const ar = emailI18n("ar");
    const html = await render(OrderShippedEmail({ order: data, i18n: ar }));
    expect(html).toContain("طلبك في الطريق إليك");
    expect(html).toContain("1Z999AA1");
    expect(orderShippedText(data, emailI18n("en"))).toContain("Tracking number: 1Z999AA1");
  });

  it("translates the sign-in email", async () => {
    const html = await render(
      SignInLinkEmail({ url: "https://shop.test/link", i18n: emailI18n("ar") }),
    );
    expect(html).toContain("تسجيل الدخول إلى ShopLane");
    expect(html).toContain("https://shop.test/link");
  });
});
