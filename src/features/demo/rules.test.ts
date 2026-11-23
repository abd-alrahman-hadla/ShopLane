import { describe, expect, it } from "vitest";
import { demoLandingPath, isDemoRole, isSameOrigin, sessionCookieName } from "./rules";

describe("demo helpers", () => {
  it("accepts only the two demo roles", () => {
    expect(isDemoRole("admin")).toBe(true);
    expect(isDemoRole("customer")).toBe(true);
    expect(isDemoRole("ADMIN")).toBe(false);
    expect(isDemoRole(null)).toBe(false);
  });

  it("sends the admin to the dashboard and the customer to their orders", () => {
    expect(demoLandingPath("admin")).toBe("/admin");
    expect(demoLandingPath("customer")).toBe("/account/orders");
    expect(demoLandingPath("admin", "ar")).toBe("/ar/admin");
    expect(demoLandingPath("customer", "fr")).toBe("/account/orders");
  });

  it("uses the Auth.js cookie name for the protocol", () => {
    expect(sessionCookieName(true)).toBe("__Secure-authjs.session-token");
    expect(sessionCookieName(false)).toBe("authjs.session-token");
  });

  it("only allows same-origin posts", () => {
    const url = "https://shop.example/api/demo/session";
    expect(isSameOrigin("https://shop.example", url)).toBe(true);
    expect(isSameOrigin("https://evil.example", url)).toBe(false);
    expect(isSameOrigin("http://shop.example", url)).toBe(false);
    expect(isSameOrigin(null, url)).toBe(false);
    expect(isSameOrigin("null", url)).toBe(false);
  });
});
