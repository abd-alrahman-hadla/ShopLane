import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const alias = { "@": fileURLToPath(new URL("./src", import.meta.url)) };
const oxc = { jsx: { runtime: "automatic" as const } };

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        oxc,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.{ts,tsx}", "prisma/**/*.test.ts"],
          exclude: ["**/*.int.test.ts", "**/node_modules/**"],
          setupFiles: ["./vitest.setup.ts"],
          restoreMocks: true,
          // next-intl imports "next/navigation" without an extension; let Vite resolve it.
          server: { deps: { inline: ["next-intl"] } },
        },
      },
      {
        resolve: { alias },
        oxc,
        test: {
          name: "integration",
          environment: "node",
          include: ["src/**/*.int.test.ts"],
          setupFiles: ["./src/test/integration-setup.ts"],
          server: { deps: { inline: ["next-intl"] } },
          // One shared test database: run files one at a time.
          fileParallelism: false,
          testTimeout: 60_000,
          hookTimeout: 60_000,
          restoreMocks: true,
        },
      },
    ],
  },
});
