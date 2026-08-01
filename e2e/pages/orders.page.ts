import type { Locator, Page } from "@playwright/test";

export class OrdersPage {
  readonly heading: Locator;
  readonly detailsCard: Locator;
  readonly cancelTrigger: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "My Orders" });
    this.detailsCard = page.getByText("Order Details");
    // The trigger, not the dialog's confirm button — both are named
    // "Cancel order", and the dialog keeps its trigger mounted underneath.
    this.cancelTrigger = page
      .getByRole("button", { name: "Cancel order", exact: true })
      .and(page.locator('[aria-haspopup="dialog"]'));
  }

  async goto(): Promise<void> {
    await this.page.goto("/orders");
  }

  /**
   * Orders render as a table, so rows are `row` — every other page object here
   * uses `article`/`listitem`, which do not exist on this page.
   */
  row(orderId: string): Locator {
    return this.page.getByRole("row").filter({ hasText: `#${orderId}` });
  }

  /** Opens the details panel for an order and waits for it to render. */
  async view(orderId: string): Promise<void> {
    await this.row(orderId).getByRole("button", { name: "View" }).click();
    await this.detailsCard.waitFor();
  }

  /** Status badge inside the details panel (not the list row). */
  detailsStatus(): Locator {
    return this.page
      .locator('[data-slot="card"]')
      .filter({ hasText: "Order Details" })
      .locator('[data-slot="badge"]')
      .first();
  }
}
