import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FullConfig } from "@playwright/test";
import { STORAGE_STATE, createE2ESession } from "./auth";

/** Creates the signed-in storage state used by authenticated specs. */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL ?? "http://localhost:3100";
  const token = await createE2ESession();
  const { hostname } = new URL(baseURL);
  const state = {
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
  await mkdir(path.dirname(STORAGE_STATE), { recursive: true });
  await writeFile(STORAGE_STATE, JSON.stringify(state, null, 2));
}
