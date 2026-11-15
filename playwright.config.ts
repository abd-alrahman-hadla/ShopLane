import { defineConfig, devices } from "@playwright/test";

// Lets specs check which integrations are configured (e.g. Stripe keys).
try {
  process.loadEnvFile(".env");
} catch {
  // No .env file: specs that need keys skip themselves.
}

/**
 * E2E runs against a production build in `.next-e2e` on its own port, so it
 * never reuses (or overwrites) a `next dev` server on port 3000 and starts
 * with an empty data cache.
 */
const port = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  // Creates/removes the e2e@example.com user and its session cookie (see e2e/support/auth.ts).
  globalSetup: "./e2e/support/global-setup.ts",
  globalTeardown: "./e2e/support/global-teardown.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  // Cold (uncached) listing renders make several round trips to Neon; from a
  // machine far from the database region that can take a few seconds.
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${port}`,
    url: baseURL,
    // `next start` outside Vercel must be told to trust the host for Auth.js.
    env: { NEXT_DIST_DIR: ".next-e2e", NEXT_PUBLIC_SITE_URL: baseURL, AUTH_TRUST_HOST: "true" },
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
