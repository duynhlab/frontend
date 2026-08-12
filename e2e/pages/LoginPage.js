export class LoginPage {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        this.page = page;
        // The SPA's /login page: a single Keycloak redirect button (no
        // in-app credential form — Direct Access Grants are off).
        this.signInButton = page.getByRole('button', { name: 'Sign in with Keycloak' });
    }

    async goto() {
        await this.page.goto('/login');
    }

    /**
     * Start the login flow. With the mock adapter (VITE_KEYCLOAK_MOCK=true,
     * the default for E2E) this completes immediately; against a real
     * Keycloak it navigates to the realm login page — follow up with
     * `loginOnKeycloak()`.
     */
    async startLogin() {
        await this.signInButton.click();
    }

    /**
     * Fill and submit the REAL Keycloak login form (realm `duynhlab`).
     * Only meaningful when E2E_REAL_KEYCLOAK=1 — see e2e/auth.setup.js.
     */
    async loginOnKeycloak(username = 'alice', password = 'password123') {
        await this.page.locator('#username').fill(username);
        await this.page.locator('#password').fill(password);
        await this.page.locator('#kc-login').click();
    }
}
