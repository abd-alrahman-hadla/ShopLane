import { defineConfig } from "prisma/config";

// Prisma 7 does not load .env automatically. Next.js reads the same file at runtime.
try {
  process.loadEnvFile(".env");
} catch {
  // No .env file (e.g. CI / Vercel): rely on the real environment.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations need a direct (non-pooled) connection on Neon.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
