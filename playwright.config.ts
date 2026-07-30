import { defineConfig, devices } from "@playwright/test";

/**
 * MAIN REGRESSION CONFIG — deterministic E2E gate.
 *
 * App mock OFF (VITE_USE_MOCK=false) + Playwright route mocks ON: requests
 * really travel through axios, the auth interceptors, and the Kong path
 * shapes, and are intercepted at the network layer (AGENTS.md testing policy).
 *
 * Ports are strict and servers are never reused: Vite bakes env at process
 * start, so a stale dev server is the classic way to run the wrong mode.
 * Stop your own `npm run dev` before running this locally.
 */
export const STORAGE_STATE = "e2e/.auth/user.json";

export default defineConfig({
  testDir: "./e2e",
  testIgnore: ["**/mock-mode/**", "**/gateway/**"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  ...(process.env.CI ? { workers: 1 } : {}),
  outputDir: "test-results",
  // No {platform} segment: snapshots are CI-Linux-canonical. Update them via
  // CI or the Playwright Docker image, not from macOS.
  snapshotPathTemplate:
    "e2e/__screenshots__/{projectName}/{testFileName}/{arg}{ext}",
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "en-US",
    timezoneId: "UTC",
  },
  projects: [
    { name: "setup", testMatch: /auth\/auth\.setup\.ts/ },
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
      testMatch: ["smoke/**/*.spec.ts", "regression/**/*.spec.ts"],
      testIgnore: ["regression/visual.spec.ts"],
    },
    {
      name: "chromium-mobile",
      // iPhone 13 metrics (390×844) but forced onto Chromium — the product
      // officially supports Chromium only (plan §13.1).
      use: { ...devices["iPhone 13"], browserName: "chromium" },
      dependencies: ["setup"],
      testMatch: [
        "smoke/**/*.spec.ts",
        "regression/navigation.spec.ts",
        "regression/toast.spec.ts",
      ],
    },
    {
      name: "visual",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        contextOptions: { reducedMotion: "reduce" },
      },
      dependencies: ["setup"],
      testMatch: "regression/visual.spec.ts",
    },
    {
      name: "visual-mobile",
      use: {
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
        contextOptions: { reducedMotion: "reduce" },
      },
      dependencies: ["setup"],
      testMatch: "regression/visual.spec.ts",
    },
  ],
  webServer: {
    command: "npm run dev -- --port 3000 --strictPort",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    stdout: "ignore",
    stderr: "pipe",
    timeout: 60_000,
    env: { VITE_USE_MOCK: "false" },
  },
});
