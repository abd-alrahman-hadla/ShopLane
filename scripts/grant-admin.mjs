#!/usr/bin/env node
/**
 * Grants (or revokes) the ADMIN role and records it in the AuditLog.
 * Runs over HTTPS (port 443), like apply-migrations.mjs.
 *
 * Usage:
 *   npm run admin:grant -- you@example.com
 *   npm run admin:grant -- you@example.com --revoke
 */
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { parseArgs } from "node:util";
import { neon } from "@neondatabase/serverless";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { revoke: { type: "boolean", default: false } },
});
const email = positionals[0]?.trim().toLowerCase();
if (!email || !email.includes("@")) {
  console.error("Usage: npm run admin:grant -- <email> [--revoke]");
  process.exit(1);
}

if (existsSync(".env")) process.loadEnvFile(".env");
const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("Missing DATABASE_URL / DIRECT_URL in .env");
  process.exit(1);
}

const role = values.revoke ? "CUSTOMER" : "ADMIN";
const sql = neon(url);
const users = await sql`select id, role from "User" where lower(email) = ${email}`;
const user = users[0];
if (!user) {
  console.error(
    `No user with email ${email}. Sign in once at /sign-in to create the account, then rerun.`,
  );
  process.exit(1);
}
if (user.role === role) {
  console.log(`${email} is already ${role}.`);
  process.exit(0);
}

await sql.transaction([
  sql`update "User" set role = ${role}, "updatedAt" = now() where id = ${user.id}`,
  sql`insert into "AuditLog" (id, "actorId", "actorEmail", action, "entityType", "entityId", summary, changes)
      values (${randomUUID()}, null, 'system', ${values.revoke ? "user.revoke_admin" : "user.grant_admin"},
              'User', ${user.id}, ${`${values.revoke ? "Revoked" : "Granted"} admin for ${email} (script)`},
              ${JSON.stringify({ role: [user.role, role] })}::jsonb)`,
]);
console.log(`${email}: ${user.role} → ${role}`);
