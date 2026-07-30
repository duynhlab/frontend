import type { Locator, Page } from "@playwright/test";

export class ProductListPage {
  readonly heading: Locator;
  /** Real product cards only — skeleton placeholders are aria-hidden. */
  readonly productCards: Locator;
  readonly pagination: Locator;
  readonly nextPage: Locator;
  readonly previousPage: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "Products" });
    this.productCards = page.getByRole("article");
    this.pagination = page.getByRole("navigation", { name: "Product pagination" });
    this.nextPage = page.getByRole("button", { name: "Go to next page" });
    this.previousPage = page.getByRole("button", { name: "Go to previous page" });
  }

  async goto(pageNum?: number): Promise<void> {
    await this.page.goto(pageNum ? `/products?page=${pageNum}` : "/products");
  }

  productLink(name: string | RegExp): Locator {
    return this.page.getByRole("article").getByRole("link", { name });
  }
}
