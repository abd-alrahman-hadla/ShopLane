import { rm } from "node:fs/promises";
import { ADMIN_STORAGE_STATE, STORAGE_STATE, cleanupE2EData } from "./auth";

/** Removes the e2e users, their orders, e2e products/coupons and the stored cookies. */
export default async function globalTeardown(): Promise<void> {
  await cleanupE2EData();
  await rm(STORAGE_STATE, { force: true });
  await rm(ADMIN_STORAGE_STATE, { force: true });
}
