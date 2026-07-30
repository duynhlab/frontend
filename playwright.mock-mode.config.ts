import { defineConfig, devices } from "@playwright/test";

/**
 * MOCK-MODE SMOKE CONFIG — protects local/offline development.
 *
 * App mock ON (VITE_USE_MOCK=true), Playwright route mocks OFF. A dedicated
 * port (3100) + strictPort + no server reuse guarantee the suite can never
 * silently run against a dev server started in the wrong mode. The suite's
 * fixtures additionally fail the run if any request leaves the app origin.
 *
 * Keep this suite SHORT — it is a smoke, not a second regression suite.
 */
export default defineConfig({
  testDir: "./e2e/mock-mode",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  outputDir: "test-results-mock-mode",
  reporter: process.env.CI
    ? [["github"], ["html", { outputFolder: "playwright-report-mock-mode", open: "never" }]]
    : [["list"]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "en-US",
    timezoneId: "UTC",
  },
  projects: [
    { name: "mock-mode-chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev -- --port 3100 --strictPort",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    stdout: "ignore",
    stderr: "pipe",
    timeout: 60_000,
    env: { VITE_USE_MOCK: "true" },
  },
});
