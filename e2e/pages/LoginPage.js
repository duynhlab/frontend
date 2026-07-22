export class LoginPage {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
        this.page = page;
        this.usernameInput = page.getByPlaceholder('alice');
        this.passwordInput = page.locator('.auth-form input[type="password"]');
        this.submitButton = page.getByRole('button', { name: 'Login' });
    }

    async goto() {
        await this.page.goto('/login');
    }

    async login(username = 'alice', password = 'password123') {
        await this.usernameInput.fill(username);
        await this.passwordInput.fill(password);
        await this.submitButton.click();
    }
}
