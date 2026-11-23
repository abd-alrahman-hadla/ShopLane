import { describe, expect, it } from "vitest";
import { emailI18n, localeOfPath, localeOfSignInUrl } from "./i18n";

describe("emailI18n", () => {
  it("translates in the requested locale with its direction", () => {
    const en = emailI18n("en");
    const ar = emailI18n("ar");
    expect(en.dir).toBe("ltr");
    expect(ar.dir).toBe("rtl");
    expect(en.t("confirmation.heading")).toBe("Thanks for your order!");
    expect(ar.t("confirmation.heading")).not.toBe(en.t("confirmation.heading"));
  });

  it("falls back to English for unknown or missing locales", () => {
    expect(emailI18n("fr").locale).toBe("en");
    expect(emailI18n(null).locale).toBe("en");
  });
});

describe("localeOfPath", () => {
  it("reads the locale prefix", () => {
    expect(localeOfPath("/ar/account")).toBe("ar");
    expect(localeOfPath("/ar")).toBe("ar");
    expect(localeOfPath("/account")).toBe("en");
    expect(localeOfPath("/")).toBe("en");
    expect(localeOfPath("/arabica-beans")).toBe("en");
  });
});

describe("localeOfSignInUrl", () => {
  const link = (callback: string) =>
    `https://shop.test/api/auth/callback/resend?callbackUrl=${encodeURIComponent(callback)}&token=t`;

  it("uses the callback URL's locale", () => {
    expect(localeOfSignInUrl(link("https://shop.test/ar/account"))).toBe("ar");
    expect(localeOfSignInUrl(link("/ar/products"))).toBe("ar");
    expect(localeOfSignInUrl(link("https://shop.test/account"))).toBe("en");
  });

  it("defaults to English without a usable callback", () => {
    expect(localeOfSignInUrl("https://shop.test/api/auth/callback/resend?token=t")).toBe("en");
    expect(localeOfSignInUrl("not a url")).toBe("en");
  });
});
