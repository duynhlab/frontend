export class HomePage {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        this.page = page;
        this.heroTitle = page.getByRole('heading', { name: /Welcome to DuynhLab/i });
        this.browseCta = page.getByRole('link', { name: /Browse Products/i });
    }

    async goto() {
        await this.page.goto('/');
    }
}
