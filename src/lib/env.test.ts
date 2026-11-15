import { describe, expect, it, vi } from "vitest";

// env.ts validates the core environment on import, so provide it first.
vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost/test");
const { parseEnv, parseServerEnv, stripeEnvSchema } = await import("./env");

describe("parseServerEnv", () => {
  it("requires DATABASE_URL", () => {
    expect(() => parseServerEnv({})).toThrow(/DATABASE_URL/);
  });

  it("defaults the site URL", () => {
    expect(parseServerEnv({ DATABASE_URL: "postgresql://u:p@host/db" }).NEXT_PUBLIC_SITE_URL).toBe(
      "http://localhost:3000",
    );
  });
});

describe("stripe env", () => {
  const base = { STRIPE_WEBHOOK_SECRET: "whsec_abc" };

  it("accepts test keys in development", () => {
    expect(
      parseEnv(stripeEnvSchema, {
        ...base,
        NODE_ENV: "development",
        STRIPE_SECRET_KEY: "sk_test_123",
      }).STRIPE_SECRET_KEY,
    ).toBe("sk_test_123");
  });

  it("rejects live keys outside production", () => {
    expect(() =>
      parseEnv(stripeEnvSchema, {
        ...base,
        NODE_ENV: "development",
        STRIPE_SECRET_KEY: "sk_live_123",
      }),
    ).toThrow(/test-mode key/);
  });

  it("allows live keys in production", () => {
    expect(() =>
      parseEnv(stripeEnvSchema, {
        ...base,
        NODE_ENV: "production",
        STRIPE_SECRET_KEY: "sk_live_123",
      }),
    ).not.toThrow();
  });

  it("requires a webhook signing secret", () => {
    expect(() =>
      parseEnv(stripeEnvSchema, {
        NODE_ENV: "development",
        STRIPE_SECRET_KEY: "sk_test_1",
        STRIPE_WEBHOOK_SECRET: "nope",
      }),
    ).toThrow(/STRIPE_WEBHOOK_SECRET/);
  });
});
