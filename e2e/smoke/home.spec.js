import { test, expect } from '../fixtures/test.js';
import { HomePage } from '../pages/HomePage.js';

test.describe('Home page', () => {
    test('shows hero and navigates to products via CTA', async ({ page }) => {
        const homePage = new HomePage(page);
        await homePage.goto();

        await expect(homePage.heroTitle).toBeVisible();
        await homePage.browseCta.click();

        await expect(page).toHaveURL(/\/products/);
        await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
    });
});
