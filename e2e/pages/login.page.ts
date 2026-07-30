import type { Locator, Page } from "@playwright/test";

export class LoginPage {
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(readonly page: Page) {
    this.usernameInput = page.getByLabel("Username");
    this.passwordInput = page.getByLabel("Password");
    this.submitButton = page.getByRole("button", { name: "Login", exact: true });
  }

  async goto(): Promise<void> {
    await this.page.goto("/login");
  }

  async login(username = "alice", password = "password123"): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
