export class ProductListPage {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        this.page = page;
        this.heading = page.getByRole('heading', { name: 'Products' });
        this.productCards = page.locator('.product-card');
        this.pagination = page.getByRole('navigation', { name: 'Product pagination' });
        this.nextPage = page.getByRole('button', { name: 'Go to next page' });
    }

    async goto(pageNum = 1) {
        const query = pageNum > 1 ? `?page=${pageNum}` : '';
        await this.page.goto(`/products${query}`);
    }
}
