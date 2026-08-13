import { test as setup } from '@playwright/test';
import { installApiMocks } from './mocks/handlers.js';
import { LoginPage } from './pages/LoginPage.js';

/**
 * Authenticate once and persist storageState for the *-authenticated project.
 *
 * Two modes (see playwright.config.js):
 *  - default: the webServer runs with VITE_KEYCLOAK_MOCK=true, so clicking
 *    "Sign in with Keycloak" authenticates via the mock adapter
 *    (src/auth/keycloak.js) — no Keycloak container required; the mock
 *    session lands in localStorage and is captured by storageState.
 *  - E2E_REAL_KEYCLOAK=1: drive the real Keycloak login form (realm
 *    `duynhlab`, client `customer-spa`) at the VITE_KEYCLOAK_URL origin
 *    (default http://localhost:8081); storageState captures the Keycloak SSO
 *    cookie, which silent check-sso resumes on the next app load.
 */
const REAL_KEYCLOAK = process.env.E2E_REAL_KEYCLOAK === '1';
const KEYCLOAK_ORIGIN = process.env.VITE_KEYCLOAK_URL || 'http://localhost:8081';

setup('authenticate', async ({ page }) => {
    await installApiMocks(page);

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.startLogin();

    if (REAL_KEYCLOAK) {
        await page.waitForURL((url) => url.origin === KEYCLOAK_ORIGIN, { timeout: 10_000 });
        await loginPage.loginOnKeycloak();
    }

    // Back on the SPA, authenticated: the header shows the Logout button.
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 10_000 });
    await page.getByRole('button', { name: 'Logout' }).waitFor({ timeout: 10_000 });
    await page.context().storageState({ path: 'e2e/.auth/user.json' });
});
