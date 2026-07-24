import { test as setup } from '@playwright/test';
import { installApiMocks } from './mocks/handlers.js';
import { LoginPage } from './pages/LoginPage.js';

setup('authenticate', async ({ page }) => {
    await installApiMocks(page);

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login();

    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 10_000 });
    await page.context().storageState({ path: 'e2e/.auth/user.json' });
});
