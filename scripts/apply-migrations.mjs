#!/usr/bin/env node
/**
 * Applies pending Prisma migrations over Neon's WebSocket driver (port 443).
 *
 * Use this when `prisma migrate deploy` cannot reach Postgres on port 5432
 * (e.g. a network that blocks it). It records each migration in `_prisma_migrations` with the
 * same sha256 checksum Prisma computes, so the two tools stay interchangeable.
 *
 * Usage:
 *   node scripts/apply-migrations.mjs                       # .env, DIRECT_URL
 *   node scripts/apply-migrations.mjs --env-file .env.test --url-var TEST_DIRECT_URL
 */
import { createHash, randomUUID } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { Pool } from "@neondatabase/serverless";

const { values: args } = parseArgs({
  options: {
    "env-file": { type: "string", default: ".env" },
    "url-var": { type: "string", default: "DIRECT_URL" },
  },
});

if (existsSync(args["env-file"])) process.loadEnvFile(args["env-file"]);
const connectionString = process.env[args["url-var"]] ?? process.env.DATABASE_URL;
if (!connectionString) {
  console.error(`Missing ${args["url-var"]} (looked in ${args["env-file"]}).`);
  process.exit(1);
}

const MIGRATIONS_DIR = path.join("prisma", "migrations");
const migrations = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

function checksumOf(script) {
  return createHash("sha256").update(script).digest("hex");
}

const pool = new Pool({ connectionString });
try {
  await pool.query(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" VARCHAR(36) PRIMARY KEY NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
  )`);
  const { rows } = await pool.query(
    `SELECT migration_name, checksum FROM "_prisma_migrations" WHERE rolled_back_at IS NULL AND finished_at IS NOT NULL`,
  );
  const applied = new Map(rows.map((row) => [row.migration_name, row.checksum]));

  let count = 0;
  for (const name of migrations) {
    const script = readFileSync(path.join(MIGRATIONS_DIR, name, "migration.sql"), "utf8");
    const checksum = checksumOf(script);
    if (applied.has(name)) {
      if (applied.get(name) !== checksum) {
        console.warn(`! ${name} was modified after it was applied (checksum mismatch).`);
      }
      continue;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const startedAt = new Date();
      await client.query(script);
      await client.query(
        `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
         VALUES ($1, $2, now(), $3, NULL, NULL, $4, 1)`,
        [randomUUID(), checksum, name, startedAt],
      );
      await client.query("COMMIT");
      console.log(`✓ applied ${name}`);
      count += 1;
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(`✗ ${name} failed and was rolled back: ${error.message}`);
      process.exitCode = 1;
      break;
    } finally {
      client.release();
    }
  }
  if (process.exitCode !== 1) {
    console.log(count === 0 ? "Database is up to date." : `Applied ${count} migration(s).`);
  }
} finally {
  await pool.end();
}
