import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".next-e2e/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "src/generated/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "import/no-default-export": "error",
    },
  },
  {
    // Next.js and tool configs require default exports.
    files: [
      "src/app/**/{page,layout,loading,error,not-found,global-error,template,default,opengraph-image,sitemap,robots}.tsx",
      "src/app/**/{sitemap,robots}.ts",
      "*.config.{ts,mts,mjs,js}",
      "prisma.config.ts",
    ],
    rules: {
      "import/no-default-export": "off",
    },
  },
];

export default eslintConfig;
