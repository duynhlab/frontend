import type { Locator, Page } from "@playwright/test";

export class ProductDetailPage {
  readonly addToCartButton: Locator;
  readonly quantityInput: Locator;
  readonly increaseQuantity: Locator;
  readonly decreaseQuantity: Locator;

  constructor(readonly page: Page) {
    this.addToCartButton = page.getByRole("button", { name: "Add to Cart" });
    this.quantityInput = page.getByLabel("Quantity:");
    this.increaseQuantity = page.getByRole("button", { name: "Increase quantity" });
    this.decreaseQuantity = page.getByRole("button", { name: "Decrease quantity" });
  }

  async goto(productId: string): Promise<void> {
    await this.page.goto(`/products/${productId}`);
  }
}
