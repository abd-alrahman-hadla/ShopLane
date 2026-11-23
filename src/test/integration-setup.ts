/**
 * Integration tests run against a separate Neon branch (TEST_DATABASE_URL in
 * .env.test) and truncate tables between tests. This guard refuses to run
 * when that URL points at the dev database from .env.
 */
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

function readEnvFile(path: string): Record<string, string> {
  return existsSync(path) ? (parseEnv(readFileSync(path, "utf8")) as Record<string, string>) : {};
}

function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace("-pooler", "");
  } catch {
    return null;
  }
}

const devEnv = readEnvFile(".env");
const testEnv = readEnvFile(".env.test");
const testUrl = testEnv.TEST_DATABASE_URL ?? process.env.TEST_DATABASE_URL;

if (!testUrl) {
  throw new Error(
    "TEST_DATABASE_URL is not set. Create a Neon `test` branch and add it to .env.test (see .env.test.example).",
  );
}
const testHost = hostOf(testUrl);
if (
  !testHost ||
  testHost === hostOf(devEnv.DATABASE_URL) ||
  testHost === hostOf(devEnv.DIRECT_URL)
) {
  throw new Error(
    "Refusing to run: TEST_DATABASE_URL points at the dev database. Use a separate Neon branch.",
  );
}

// Point the app at the test branch before any app module is imported.
process.env.DATABASE_URL = testUrl;
process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
process.env.STRIPE_SECRET_KEY = "sk_test_integration_fake";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_integration_test_secret";
delete process.env.RESEND_API_KEY;

// Server code reads the locale and messages from next-intl; outside a request, use English.
await import("./intl");
