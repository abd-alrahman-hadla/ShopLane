import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

/** README screenshots only (desktop, one worker so the shots are deterministic). */
export default defineConfig({
  ...base,
  testDir: "./e2e/screenshots",
  testMatch: "**/*.screens.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  projects: [
    {
      name: "screenshots",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 860 } },
    },
  ],
});
