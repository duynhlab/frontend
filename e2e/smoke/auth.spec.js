import { test, expect } from '../fixtures/test.js';

test.describe('Auth guard', () => {
    test('redirects unauthenticated users from /cart to login', async ({ page }) => {
        await page.goto('/cart');

        await expect(page).toHaveURL(/\/login\?returnTo=%2Fcart/);
        await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
    });
});
