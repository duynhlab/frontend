import type { Locator, Page } from "@playwright/test";

export class CheckoutPage {
  readonly heading: Locator;
  readonly continueToShipping: Locator;
  readonly continueToPayment: Locator;
  readonly reviewOrder: Locator;
  readonly placeOrder: Locator;
  readonly promoInput: Locator;
  readonly applyPromo: Locator;
  readonly cancelCheckout: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "Checkout", exact: true });
    this.continueToShipping = page.getByRole("button", { name: "Continue to shipping" });
    this.continueToPayment = page.getByRole("button", { name: "Continue to payment" });
    this.reviewOrder = page.getByRole("button", { name: "Review order" });
    this.placeOrder = page.getByRole("button", { name: /Place order/ });
    this.promoInput = page.getByLabel("Promo code");
    this.applyPromo = page.getByRole("button", { name: "Apply" });
    this.cancelCheckout = page.getByRole("button", { name: "Cancel checkout" });
  }

  async goto(): Promise<void> {
    await this.page.goto("/checkout");
  }

  async fillAddress({
    fullName = "Alice E2E",
    line1 = "1 Test Street",
    city = "Hanoi",
    country = "VN",
  } = {}): Promise<void> {
    await this.page.getByLabel("Full name *").fill(fullName);
    await this.page.getByLabel("Address line 1 *").fill(line1);
    await this.page.getByLabel("City *").fill(city);
    await this.page.getByLabel("Country code *").fill(country);
  }

  /** Walks the funnel from step 1 to the review step. */
  async advanceToReview(): Promise<void> {
    await this.fillAddress();
    await this.continueToShipping.click();
    await this.continueToPayment.click();
    await this.reviewOrder.click();
    await this.placeOrder.waitFor();
  }
}
