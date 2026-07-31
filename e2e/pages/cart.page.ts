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
    // Anchored on the semantic list item, not on a Tailwind class: the previous
    // xpath keyed off `justify-between`, which the density refactor removed.
    return this.page.getByRole("listitem").filter({ hasText: productName });
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
