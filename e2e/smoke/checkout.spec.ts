import { expect, test } from "../fixtures/app.fixture";
import { ProductDetailPage } from "../pages/product-detail.page";
import { CheckoutPage } from "../pages/checkout.page";
import { toastWithText } from "../utils/toast";

test.use({ storageState: "e2e/.auth/user.json" });

async function seedCartViaUi(page: import("@playwright/test").Page) {
  const detail = new ProductDetailPage(page);
  await detail.goto("prod-00001");
  await detail.addToCartButton.click();
  await toastWithText(page, "Added to cart").waitFor();
}

test.describe("Checkout journey", () => {
  test("happy path with save10 places exactly one order", async ({
    page,
    contract,
  }) => {
    await seedCartViaUi(page);

    const checkout = new CheckoutPage(page);
    await checkout.goto();
    await expect(checkout.heading).toBeVisible();
    await checkout.fillAddress();
    await checkout.continueToShipping.click();
    await checkout.continueToPayment.click();
    await checkout.reviewOrder.click();

    // Promo is validated inline; totals update.
    await checkout.promoInput.fill("save10");
    await checkout.applyPromo.click();
    await expect(toastWithText(page, "Promo applied — totals updated.")).toBeVisible();
    await expect(page.getByText(/Discount \(SAVE10\)/i)).toBeVisible();

    // Rapid double-click on the confirm CTA — the busy state must swallow the
    // second click; the contract asserts exactly one confirm request fired.
    await checkout.placeOrder.dblclick();
    await expect(page.getByRole("heading", { name: "Order placed!" })).toBeVisible();
    await expect(toastWithText(page, "Order placed successfully")).toBeVisible();

    contract.expectCall({
      method: "POST",
      path: /\/checkout\/v1\/private\/checkout\/sessions$/,
      times: 1,
      headers: { authorization: /^Bearer / },
    });
    contract.expectCall({
      method: "PUT",
      path: /\/checkout\/v1\/private\/checkout\/sessions\/[^/]+\/address$/,
      times: 1,
      body: (body) => {
        expect(body).toMatchObject({ city: "Hanoi", country: "VN" });
      },
    });
    contract.expectCall({
      method: "POST",
      path: /\/checkout\/v1\/private\/checkout\/sessions\/[^/]+\/confirm$/,
      times: 1,
      headers: {
        authorization: /^Bearer /,
        "idempotency-key": /.+/,
      },
      label: "checkout confirm (idempotent, exactly once)",
    });
  });

  test("failure then retry reuses the same Idempotency-Key and creates one order", async ({
    page,
    contract,
  }) => {
    await seedCartViaUi(page);

    const checkout = new CheckoutPage(page);
    await checkout.goto();
    await checkout.advanceToReview();

    // First confirm attempt fails at the gateway (page.route overrides run
    // before the context-level dispatcher).
    let failedOnce = false;
    await page.route(/\/checkout\/v1\/private\/checkout\/sessions\/[^/]+\/confirm$/, async (route) => {
      if (!failedOnce) {
        failedOnce = true;
        contract.record(route.request());
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Internal server error" }),
        });
        return;
      }
      await route.fallback();
    });

    await checkout.placeOrder.click();
    await expect(
      toastWithText(page, "Something went wrong. Please try again later."),
    ).toBeVisible();

    // Retry succeeds; both attempts must carry the SAME Idempotency-Key.
    await checkout.placeOrder.click();
    await expect(page.getByRole("heading", { name: "Order placed!" })).toBeVisible();

    const confirms = contract.calls(
      "POST",
      /\/checkout\/v1\/private\/checkout\/sessions\/[^/]+\/confirm$/,
    );
    expect(confirms).toHaveLength(2);
    const keys = confirms.map((c) => c.headers["idempotency-key"]);
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
  });

  test("cancel requires confirmation and returns to the cart", async ({ page }) => {
    await seedCartViaUi(page);

    const checkout = new CheckoutPage(page);
    await checkout.goto();
    await expect(checkout.heading).toBeVisible();

    await checkout.cancelCheckout.click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    // Escape keeps the checkout (focus trap + dismiss behavior).
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(checkout.heading).toBeVisible();

    await checkout.cancelCheckout.click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Cancel checkout" })
      .click();
    await expect(page).toHaveURL(/\/cart$/);
    await expect(toastWithText(page, "Checkout cancelled.")).toBeVisible();
  });
});
