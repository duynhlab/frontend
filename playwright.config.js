import { defineConfig, devices } from '@playwright/test';

// E2E_REAL_KEYCLOAK=1 drives the real Keycloak login form (requires a
// reachable Keycloak at VITE_KEYCLOAK_URL, e.g. the local-stack container on
// http://localhost:8081). Default: the in-app mock Keycloak adapter, so the
// suite runs with no auth server at all. See e2e/auth.setup.js.
const REAL_KEYCLOAK = process.env.E2E_REAL_KEYCLOAK === '1';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: process.env.CI ? 'github' : 'html',
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        stdout: 'ignore',
        stderr: 'pipe',
        // E2E uses Playwright route mocks — disable in-app mock so HTTP is
        // intercepted. Auth is the exception: unless E2E_REAL_KEYCLOAK=1,
        // the mock Keycloak adapter stands in for the OIDC redirect flow.
        env: {
            VITE_USE_MOCK: 'false',
            VITE_KEYCLOAK_MOCK: REAL_KEYCLOAK ? 'false' : 'true',
        },
    },
    projects: [
        { name: 'setup', testMatch: /auth\.setup\.js/ },
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
            testIgnore: [/auth\.setup\.js/, /authenticated\.spec\.js/],
        },
        {
            name: 'chromium-authenticated',
            testMatch: /authenticated\.spec\.js/,
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'e2e/.auth/user.json',
            },
            dependencies: ['setup'],
        },
    ],
});
