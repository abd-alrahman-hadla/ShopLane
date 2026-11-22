#!/usr/bin/env node
/**
 * Runs Lighthouse CI (mobile + desktop) and records the median scores in
 * docs/lighthouse/scores.json, which the README table is built from.
 *
 *   npm run lighthouse                         # local production build (.next-e2e)
 *   npm run lighthouse -- --url https://…      # a deployed site
 *   npm run lighthouse -- --no-save            # CI: assert only, don't touch scores.json
 *
 * Exits non-zero when any category's median run is below 0.95.
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const urlIndex = args.indexOf("--url");
const siteUrl = urlIndex >= 0 ? args[urlIndex + 1] : undefined;
const save = !args.includes("--no-save");
const target = siteUrl ? "production" : "local";
const SCORES_FILE = "docs/lighthouse/scores.json";

const baseEnv = {
  ...process.env,
  NEXT_DIST_DIR: process.env.NEXT_DIST_DIR ?? ".next-e2e",
  AUTH_TRUST_HOST: "true",
  ...(siteUrl && { LIGHTHOUSE_BASE_URL: siteUrl }),
};

if (!siteUrl && !existsSync(`${baseEnv.NEXT_DIST_DIR}/BUILD_ID`)) {
  console.error(
    `No build in ${baseEnv.NEXT_DIST_DIR}. Run: NEXT_DIST_DIR=${baseEnv.NEXT_DIST_DIR} npm run build`,
  );
  process.exit(1);
}

const results = {};
let failed = false;

for (const preset of ["mobile", "desktop"]) {
  rmSync(`lighthouse-reports/${preset}`, { recursive: true, force: true });
  console.log(`\n▶ Lighthouse (${preset}) against ${siteUrl ?? "local build"}`);
  try {
    execSync("npx lhci autorun --config=lighthouserc.cjs", {
      stdio: "inherit",
      env: { ...baseEnv, LIGHTHOUSE_FORM_FACTOR: preset },
    });
  } catch {
    failed = true; // assertion failures; scores are still recorded below
  }
  const manifestPath = `lighthouse-reports/${preset}/manifest.json`;
  if (!existsSync(manifestPath)) {
    console.error(`No results for ${preset} (${manifestPath} missing).`);
    failed = true;
    continue;
  }
  for (const run of JSON.parse(readFileSync(manifestPath, "utf8"))) {
    if (!run.isRepresentativeRun) continue;
    const path = new URL(run.url).pathname;
    results[path] ??= {};
    results[path][preset] = Object.fromEntries(
      Object.entries(run.summary).map(([category, score]) => [category, Math.round(score * 100)]),
    );
  }
}

console.log(`\nMedian scores (${target}):`);
for (const [path, presets] of Object.entries(results)) {
  for (const [preset, scores] of Object.entries(presets)) {
    console.log(
      `  ${path.padEnd(42)} ${preset.padEnd(8)} ` +
        Object.entries(scores)
          .map(([category, score]) => `${category} ${score}`)
          .join(" · "),
    );
  }
}

if (save && Object.keys(results).length > 0) {
  mkdirSync("docs/lighthouse", { recursive: true });
  const existing = existsSync(SCORES_FILE) ? JSON.parse(readFileSync(SCORES_FILE, "utf8")) : {};
  existing[target] = {
    measuredAt: new Date().toISOString().slice(0, 10),
    url: siteUrl ?? "next start (production build, local machine)",
    pages: results,
  };
  writeFileSync(SCORES_FILE, `${JSON.stringify(existing, null, 2)}\n`);
  console.log(`\nSaved to ${SCORES_FILE}`);
}

process.exit(failed ? 1 : 0);
