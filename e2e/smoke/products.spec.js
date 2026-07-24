import { test, expect } from '../fixtures/test.js';
import { ProductListPage } from '../pages/ProductListPage.js';

test.describe('Product list', () => {
    test('renders mocked products', async ({ page }) => {
        const productListPage = new ProductListPage(page);
        await productListPage.goto();

        await expect(productListPage.heading).toBeVisible();
        await expect(productListPage.productCards).toHaveCount(24);
        await expect(page.getByText('Wireless Headphones')).toBeVisible();
        await expect(page.getByText('Smart Watch')).toBeVisible();
    });

    test('paginates to the next page', async ({ page }) => {
        const productListPage = new ProductListPage(page);
        await productListPage.goto();

        await expect(productListPage.pagination.getByText('Page 1 of 2', { exact: true })).toBeVisible();
        await productListPage.nextPage.click();

        await expect(page).toHaveURL(/page=2/);
        await expect(productListPage.pagination.getByText('Page 2 of 2', { exact: true })).toBeVisible();
        await expect(page.getByText('Ergonomic Chair')).toBeVisible();
    });
});
