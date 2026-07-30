import { expect, test } from "../fixtures/app.fixture";
import { ProductDetailPage } from "../pages/product-detail.page";
import { CheckoutPage } from "../pages/checkout.page";
import { toastRegion, toastWithText } from "../utils/toast";

/**
 * Toast regression (plan §13.4) — exactly one toaster, accessible live
 * region, loading→settled without stacking, dedup, dismissal, and zero
 * react-hot-toast DNA left in the DOM.
 */
test.use({ storageState: "e2e/.auth/user.json" });

test("exactly one toaster region is mounted and it is a landmark", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Notifications" })).toHaveCount(1);
});

test("success toast appears, can be dismissed, and auto-hides", async ({ page }) => {
  const detail = new ProductDetailPage(page);
  await detail.goto("prod-00001");

  await detail.addToCartButton.click();
  const toast = toastWithText(page, "Added to cart");
  await expect(toast).toBeVisible();

  // Manual dismissal. Base UI keeps the close control aria-hidden until the
  // viewport is hovered/focused (the toast itself is announced via the live
  // region), so hover first; the data-slot hook is the documented exception
  // to role-first locators here.
  await toastRegion(page).getByRole("dialog").first().hover();
  await toastRegion(page).locator('[data-slot="toast-close"]').first().click();
  await expect(toast).toBeHidden();

  // A second toast auto-hides after its timeout (generous, non-exact bound).
  await detail.addToCartButton.click();
  await expect(toastWithText(page, "Added to cart")).toBeVisible();
  await expect(toastWithText(page, "Added to cart")).toBeHidden({ timeout: 8_000 });
});

test("rapid repeats with a dedup key update in place instead of stacking", async ({
  page,
}) => {
  const detail = new ProductDetailPage(page);
  await detail.goto("prod-00001");

  await detail.addToCartButton.click();
  await toastWithText(page, "Added to cart").waitFor();
  await detail.addToCartButton.click();

  // Same dedup key ('cart-add') → one toast, updated in place. This also
  // guards the StrictMode double-invoke class of duplicates.
  await expect(toastWithText(page, "Added to cart")).toHaveCount(1);
});

test("error toast appears when a cart mutation fails", async ({ page }) => {
  const detail = new ProductDetailPage(page);
  await detail.goto("prod-00001");

  await page.route(
    (url) => /\/cart\/v1\/private\/cart$/.test(url.pathname),
    async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal server error" }),
      });
    },
  );

  await detail.addToCartButton.click();
  await expect(
    toastWithText(page, "Something went wrong. Please try again later."),
  ).toBeVisible();
});

test("checkout loading toast settles into success without stacking", async ({
  page,
}) => {
  const detail = new ProductDetailPage(page);
  await detail.goto("prod-00001");
  await detail.addToCartButton.click();
  await toastWithText(page, "Added to cart").waitFor();

  const checkout = new CheckoutPage(page);
  await checkout.goto();
  await checkout.advanceToReview();
  await checkout.placeOrder.click();

  await expect(toastWithText(page, "Order placed successfully")).toBeVisible();
  // The loading toast was dismissed, not left stacked behind the success one.
  await expect(toastWithText(page, "Placing order...")).toBeHidden();
});

test("no react-hot-toast DOM signature remains", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#_rht_toaster")).toHaveCount(0);
  await expect(page.locator('[class*="react-hot-toast"]')).toHaveCount(0);
});
