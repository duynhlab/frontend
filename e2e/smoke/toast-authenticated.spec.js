import { test, expect } from '../fixtures/test.js';

test.describe('Toast notifications (authenticated)', () => {
    test('shows success toast when adding to cart', async ({ page }) => {
        await page.goto('/products/prod-00001');

        await expect(page.getByRole('button', { name: 'Add to Cart' })).toBeEnabled();
        await page.getByRole('button', { name: 'Add to Cart' }).click();

        await expect(page.getByText('Added to cart')).toBeVisible();
    });
});
