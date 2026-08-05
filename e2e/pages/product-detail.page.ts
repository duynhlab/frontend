import type { Locator, Page } from "@playwright/test";

export class ProductDetailPage {
  readonly addToCartButton: Locator;
  readonly quantityInput: Locator;
  readonly increaseQuantity: Locator;
  readonly decreaseQuantity: Locator;
  /**
   * The inventory availability line. Matched on its wording rather than
   * structurally: the four states are the only text on this page shaped like
   * this, and the accessible content is the point — the colour is decoration.
   */
  readonly availabilityLine: Locator;

  constructor(readonly page: Page) {
    this.addToCartButton = page.getByRole("button", { name: "Add to Cart" });
    this.quantityInput = page.getByLabel("Quantity:");
    this.increaseQuantity = page.getByRole("button", { name: "Increase quantity" });
    this.decreaseQuantity = page.getByRole("button", { name: "Decrease quantity" });
    this.availabilityLine = page.getByText(
      /^(In Stock|Low Stock|Out of Stock)(\s\(\d+\))?$|^Availability unknown$/,
    );
  }

  async goto(productId: string): Promise<void> {
    await this.page.goto(`/products/${productId}`);
  }
}
