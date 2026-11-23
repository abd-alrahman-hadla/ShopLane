/** Pure demo-mode rules (no database), shared by the route handler and tests. */
import type { Role } from "@/generated/prisma/client";

/**
 * One-click demo accounts for the public deployment (DEMO_MODE=true only).
 * The customer is a seeded demo shopper with orders and reviews; the admin is
 * created on first use. Stripe stays in test mode (enforced in lib/env.ts).
 */
export const DEMO_ACCOUNTS = {
  admin: { email: "demo-admin@shoplane.dev", name: "Demo Admin", role: "ADMIN" },
  customer: { email: "demo1@example.com", name: "Jamie Rivera", role: "CUSTOMER" },
} as const satisfies Record<string, { email: string; name: string; role: Role }>;

export type DemoRole = keyof typeof DEMO_ACCOUNTS;

export const DEMO_SESSION_HOURS = 2;

export function isDemoRole(value: unknown): value is DemoRole {
  return value === "admin" || value === "customer";
}

/** Where each demo account lands after signing in. */
export function demoLandingPath(role: DemoRole, locale: string = "en"): string {
  const prefix = locale === "ar" ? "/ar" : "";
  return `${prefix}${role === "admin" ? "/admin" : "/account/orders"}`;
}

/**
 * Auth.js names the cookie with the __Secure- prefix over HTTPS. It must match
 * what Auth.js expects, or the session is ignored.
 */
export function sessionCookieName(secure: boolean): string {
  return secure ? "__Secure-authjs.session-token" : "authjs.session-token";
}

/** Only same-origin form posts may start a demo session (no login CSRF). */
export function isSameOrigin(origin: string | null, requestUrl: string): boolean {
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(requestUrl).origin;
  } catch {
    return false;
  }
}
