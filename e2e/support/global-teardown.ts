import { rm } from "node:fs/promises";
import { STORAGE_STATE, deleteE2EUser } from "./auth";

/** Removes the e2e user (and everything that cascades from it) and the stored cookie. */
export default async function globalTeardown(): Promise<void> {
  await deleteE2EUser();
  await rm(STORAGE_STATE, { force: true });
}
