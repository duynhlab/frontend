import { test, expect } from '../fixtures/test.js';

test.describe('Toast notifications (unauthenticated)', () => {
    test('shows welcome toast on login', async ({ page }) => {
        await page.goto('/login');

        await page.getByLabel('Username').fill('alice');
        await page.getByLabel('Password').fill('password123');
        await page.getByRole('button', { name: 'Login', exact: true }).click();

        await expect(page.getByText('Welcome back')).toBeVisible();
    });
});
