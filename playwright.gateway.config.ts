import { defineConfig, devices } from "@playwright/test";

/**
 * GATEWAY SMOKE CONFIG — real-integration gate (no mocks of any kind).
 *
 * Runs against a deployed frontend + a real Kong gateway (local-stack or
 * staging). No app mock, no route fulfillment — observation-only listeners.
 * This is a MANDATORY pre-cutover gate, not a per-PR gate.
 *
 * Required env:
 *   E2E_BASE_URL          deployed frontend origin
 *   E2E_GATEWAY_URL       Kong origin the SPA was built against
 *   E2E_GATEWAY_USERNAME  dedicated test account (never production creds)
 *   E2E_GATEWAY_PASSWORD
 * Optional:
 *   E2E_GATEWAY_CHECKOUT  "readonly" (default) stops before submit;
 *                         "submit" places one idempotent order.
 */
const baseURL = process.env.E2E_BASE_URL;
const gatewayURL = process.env.E2E_GATEWAY_URL;

if (!baseURL) throw new Error("E2E_BASE_URL is required for the gateway smoke");
if (!gatewayURL) throw new Error("E2E_GATEWAY_URL is required for the gateway smoke");

export default defineConfig({
  testDir: "./e2e/gateway",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir: "test-results-gateway",
  reporter: [["list"], ["html", { outputFolder: "playwright-report-gateway", open: "never" }]],
  use: {
    baseURL,
    // retain-on-failure only: traces capture request bodies, including the
    // test account's login POST — never record them for green runs, and the
    // workflow deliberately does not upload test-results-gateway/.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "en-US",
    timezoneId: "UTC",
  },
  projects: [{ name: "gateway-chromium", use: { ...devices["Desktop Chrome"] } }],
  // No webServer: the caller deploys/serves the app (staging URL, or a local
  // `vite preview` of a build pointed at a local Kong).
});
