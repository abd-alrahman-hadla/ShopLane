/**
 * Lighthouse CI: home + a product page, 3 runs each, median run asserted at ≥ 0.95.
 *
 * (Not LHCI_* names: LHCI reads those as its own CLI flags.)
 * LIGHTHOUSE_FORM_FACTOR=mobile|desktop picks the form factor (default mobile).
 * LIGHTHOUSE_BASE_URL points at a deployed site; without it LHCI starts `next start`
 * on port 3100 from the build in NEXT_DIST_DIR (default .next-e2e).
 */
const base = (process.env.LIGHTHOUSE_BASE_URL ?? "http://localhost:3100").replace(/\/$/, "");
const preset = process.env.LIGHTHOUSE_FORM_FACTOR === "desktop" ? "desktop" : "mobile";
const PAGES = ["/", "/products/ethiopia-yirgacheffe-kochere"];
const MIN = { minScore: 0.95, aggregationMethod: "median-run" };

module.exports = {
  ci: {
    collect: {
      url: PAGES.map((path) => `${base}${path}`),
      numberOfRuns: 3,
      ...(!process.env.LIGHTHOUSE_BASE_URL && {
        startServerCommand: "npx next start -p 3100",
        startServerReadyPattern: "Ready in",
        startServerReadyTimeout: 120000,
      }),
      settings: {
        ...(preset === "desktop" && { preset: "desktop" }),
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
        chromeFlags: "--headless=new --no-sandbox",
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", MIN],
        "categories:accessibility": ["error", MIN],
        "categories:best-practices": ["error", MIN],
        "categories:seo": ["error", MIN],
      },
    },
    upload: { target: "filesystem", outputDir: `lighthouse-reports/${preset}` },
  },
};
