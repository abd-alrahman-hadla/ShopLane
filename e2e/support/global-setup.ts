import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FullConfig } from "@playwright/test";
import { ADMIN_STORAGE_STATE, STORAGE_STATE, createE2EFixtures } from "./auth";

function storageState(token: string, hostname: string) {
  return {
    cookies: [
      {
        // Auth.js cookie name over plain HTTP (localhost); HTTPS uses the __Secure- prefix.
        name: "authjs.session-token",
        value: token,
        domain: hostname,
        path: "/",
        expires: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
        httpOnly: true,
        secure: false,
        sameSite: "Lax" as const,
      },
    ],
    origins: [],
  };
}

/** Creates the signed-in storage states and fixtures used by authenticated specs. */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL ?? "http://localhost:3100";
  const { hostname } = new URL(baseURL);
  const fixtures = await createE2EFixtures();
  await mkdir(path.dirname(STORAGE_STATE), { recursive: true });
  await writeFile(
    STORAGE_STATE,
    JSON.stringify(storageState(fixtures.customerToken, hostname), null, 2),
  );
  await writeFile(
    ADMIN_STORAGE_STATE,
    JSON.stringify(storageState(fixtures.adminToken, hostname), null, 2),
  );
  // Specs read the order number from here.
  process.env.E2E_ORDER_NUMBER = String(fixtures.orderNumber);
}
