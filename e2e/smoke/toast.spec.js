import { test, expect } from '../fixtures/test.js';

test.describe('Toast notifications (unauthenticated)', () => {
    test('shows welcome toast on login', async ({ page }) => {
        await page.goto('/login');

        await page.getByPlaceholder('alice').fill('alice');
        await page.locator('.auth-form input[type="password"]').fill('password123');
        await page.getByRole('button', { name: 'Login' }).click();

        await expect(page.getByText('Welcome back')).toBeVisible();
    });
});
