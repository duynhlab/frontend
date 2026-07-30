import type { Locator, Page } from "@playwright/test";

export class HomePage {
  readonly heroTitle: Locator;
  readonly browseCta: Locator;

  constructor(readonly page: Page) {
    this.heroTitle = page.getByRole("heading", { name: /Welcome to DuynhLab/i });
    this.browseCta = page.getByRole("link", { name: /Browse Products/i });
  }

  async goto(): Promise<void> {
    await this.page.goto("/");
  }
}
