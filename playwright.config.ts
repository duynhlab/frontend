import { defineConfig, devices } from '@playwright/test'

/**
 * E2E against the real local stack — no mocks (owner rule): Keycloak on :8081
 * and the Envoy Gateway edge on :8080 must be up
 * (`cd ../homelab/local-stack && docker compose up -d`).
 *
 * Serial with one worker on purpose. The specs share one shopper account and
 * one cart, and the gateway rate-limits at roughly 5 req/s — parallel workers
 * would fight over both.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: true,
  },
})
