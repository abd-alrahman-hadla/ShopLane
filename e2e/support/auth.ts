/**
 * E2E auth: ShopLane uses database sessions, so tests sign in by inserting a
 * Session row for a dedicated e2e user and sending its token as the Auth.js
 * cookie. Only `e2e@example.com` is ever written to (and removed from) the DB.
 */
import { randomBytes, randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";

export const E2E_USER_EMAIL = "e2e@example.com";
export const E2E_USER_NAME = "Casey Tester";
export const STORAGE_STATE = "e2e/.auth/user.json";

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required for authenticated e2e tests.");
  return neon(url);
}

/** Removes the e2e user; reviews, wishlist, addresses and sessions cascade. */
export async function deleteE2EUser(): Promise<void> {
  await sql()`delete from "User" where email = ${E2E_USER_EMAIL}`;
}

/** Recreates the e2e user with a fresh session and returns its session token. */
export async function createE2ESession(): Promise<string> {
  const query = sql();
  await deleteE2EUser();
  const userId = `e2e_${randomUUID()}`;
  const token = randomBytes(32).toString("hex");
  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  await query`
    insert into "User" (id, email, name, role, "emailVerified", "createdAt", "updatedAt")
    values (${userId}, ${E2E_USER_EMAIL}, ${E2E_USER_NAME}, 'CUSTOMER', ${now}, ${now}, ${now})`;
  await query`
    insert into "Session" ("sessionToken", "userId", expires, "createdAt", "updatedAt")
    values (${token}, ${userId}, ${expires}, ${now}, ${now})`;
  return token;
}
