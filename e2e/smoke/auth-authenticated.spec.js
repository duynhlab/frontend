import { test, expect } from '../fixtures/test.js';

test.describe('Authenticated navigation', () => {
    test('shows protected nav links when logged in', async ({ page }) => {
        await page.goto('/');

        await expect(page.getByRole('link', { name: 'Cart' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Orders' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
    });
});
