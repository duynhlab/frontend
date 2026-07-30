import { expect, test } from "../fixtures/app.fixture";
import { ProductDetailPage } from "../pages/product-detail.page";
import { CheckoutPage } from "../pages/checkout.page";
import { toastWithText } from "../utils/toast";
import type { Page } from "@playwright/test";

/**
 * Visual regression — deterministic screenshots of the merge-gate surfaces.
 * Runs only in the `visual` / `visual-mobile` projects (fixed viewports,
 * deviceScaleFactor 1, reduced motion). Snapshots are CI-Linux-canonical
 * (snapshotPathTemplate has no {platform}); update via CI or the Playwright
 * Docker image, never from macOS. Do not raise thresholds to hide diffs.
 */

async function stabilize(page: Page): Promise<void> {
  // Deterministic clock for any relative/locale time rendering.
  await page.clock.setFixedTime(new Date("2026-07-30T12:00:00Z"));
  await page.addStyleTag({
    content: `*, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      caret-color: transparent !important;
    }`,
  });
  await page.evaluate(() => document.fonts.ready);
}

test.beforeEach(async ({ page }) => {
  await stabilize(page);
});

test("app shell with catalog", async ({ page }) => {
  await page.goto("/products");
  await expect(page.getByRole("article")).toHaveCount(24);
  await expect(page).toHaveScreenshot("catalog.png", { fullPage: false });
});

test("login form (normal and error states)", async ({ page }) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Login", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("login.png");

  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page.getByText("Username is required")).toBeVisible();
  await expect(page).toHaveScreenshot("login-errors.png");
});

test.describe("authenticated surfaces", () => {
  test.use({ storageState: "e2e/.auth/user.json" });

  test("filled cart with confirmation dialog", async ({ page }) => {
    const detail = new ProductDetailPage(page);
    await detail.goto("prod-00001");
    await detail.addToCartButton.click();
    await toastWithText(page, "Added to cart").waitFor();

    await page.goto("/cart");
    await expect(
      page.getByText("Wireless Headphones", { exact: true }),
    ).toBeVisible();
    await expect(page).toHaveScreenshot("cart.png");

    await page
      .getByRole("button", { name: "Remove", exact: true })
      .and(page.locator('[aria-haspopup="dialog"]'))
      .click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await expect(page).toHaveScreenshot("cart-confirm-dialog.png");
  });

  test("checkout address step", async ({ page }) => {
    const detail = new ProductDetailPage(page);
    await detail.goto("prod-00001");
    await detail.addToCartButton.click();
    await toastWithText(page, "Added to cart").waitFor();

    const checkout = new CheckoutPage(page);
    await checkout.goto();
    await expect(checkout.heading).toBeVisible();
    await expect(checkout.continueToShipping).toBeVisible();
    // The success toast from add-to-cart may still be up — wait it out so the
    // shot is deterministic.
    await expect(toastWithText(page, "Added to cart")).toBeHidden({
      timeout: 8_000,
    });
    await expect(page).toHaveScreenshot("checkout-address.png");
  });

  test("toast appearance (success)", async ({ page }) => {
    const detail = new ProductDetailPage(page);
    await detail.goto("prod-00001");
    await detail.addToCartButton.click();
    const toast = page
      .getByRole("region", { name: "Notifications" })
      .getByRole("dialog")
      .first();
    await expect(toast).toBeVisible();
    // Element shot: viewport-independent, no dynamic page content behind it.
    await expect(toast).toHaveScreenshot("toast-success.png");
  });
});
