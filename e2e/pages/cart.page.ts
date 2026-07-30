import type { Locator, Page } from "@playwright/test";

export class CartPage {
  readonly heading: Locator;
  readonly checkoutCta: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "Shopping Cart" });
    this.checkoutCta = page.getByRole("link", { name: "Proceed to Checkout" });
  }

  async goto(): Promise<void> {
    await this.page.goto("/cart");
  }

  itemRow(productName: string | RegExp): Locator {
    return this.page
      .getByText(productName)
      .locator("xpath=ancestor::div[contains(@class, 'justify-between')][1]");
  }

  removeButton(): Locator {
    // The row trigger opens a confirmation dialog (aria-haspopup) — this
    // distinguishes it from the dialog's own confirm button, which Base UI
    // keeps mounted during exit transitions.
    return this.page
      .getByRole("button", { name: "Remove", exact: true })
      .and(this.page.locator('[aria-haspopup="dialog"]'));
  }
}
