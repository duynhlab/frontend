import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "../fixtures/app.fixture";
import { ProductDetailPage } from "../pages/product-detail.page";
import { CartPage } from "../pages/cart.page";
import { CheckoutPage } from "../pages/checkout.page";
import { toastWithText } from "../utils/toast";
import type { Page } from "@playwright/test";

/**
 * Pointer target size — WCAG 2.5.8 (AA, 2.2).
 *
 * Deliberately its own spec rather than another case in accessibility.spec.ts:
 * `target-size` carries the `wcag22aa` tag, which the main gate's
 * `wcag2a`/`wcag2aa` filter silently excludes, so every control-height change
 * was previously unguarded. `withRules` bypasses tag filtering entirely.
 *
 * Runs on the mobile project as well as desktop, since the rule's spacing
 * exemption depends on how densely targets pack at the rendered width.
 */

async function expectNoUndersizedTargets(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withRules(["target-size"])
    .analyze();
  expect(
    results.violations.flatMap((v) =>
      v.nodes.map((n) => `${n.target.join(" ")} — ${n.failureSummary?.split("\n").pop()?.trim()}`),
    ),
    "targets smaller than 24x24 with no spacing exemption",
  ).toEqual([]);
}

test.describe("target size (guest)", () => {
  for (const route of ["/", "/products", "/products/prod-00001", "/login", "/nope"]) {
    test(`all targets meet 24px on ${route}`, async ({ page }) => {
      await page.goto(route);
      await expect(page.getByRole("heading").first()).toBeVisible();
      await expectNoUndersizedTargets(page);
    });
  }

  test("mobile navigation sheet rows meet 24px", async ({ page }) => {
    await page.goto("/");
    const hamburger = page.getByRole("button", { name: "Open menu" });
    test.skip(!(await hamburger.isVisible()), "desktop renders the inline nav");
    await hamburger.click();
    await expect(page.getByRole("dialog")).toHaveCSS("opacity", "1");
    await expectNoUndersizedTargets(page);
  });
});

test.describe("target size (authenticated)", () => {
  test.use({ storageState: "e2e/.auth/user.json" });

  for (const route of ["/orders", "/notifications", "/profile"]) {
    test(`all targets meet 24px on ${route}`, async ({ page }) => {
      await page.goto(route);
      await expect(page.getByRole("heading").first()).toBeVisible();
      await expectNoUndersizedTargets(page);
    });
  }

  test("cart, checkout and the confirm dialog meet 24px", async ({ page }) => {
    const detail = new ProductDetailPage(page);
    await detail.goto("prod-00001");
    await detail.addToCartButton.click();
    await toastWithText(page, "Added to cart").waitFor();

    const cart = new CartPage(page);
    await cart.goto();
    await expect(cart.heading).toBeVisible();
    await expectNoUndersizedTargets(page);

    await cart.removeButton().click();
    await expect(page.getByRole("alertdialog")).toHaveCSS("opacity", "1");
    await expectNoUndersizedTargets(page);
    await page.keyboard.press("Escape");

    const checkout = new CheckoutPage(page);
    await checkout.goto();
    await expect(checkout.heading).toBeVisible();
    await expectNoUndersizedTargets(page);
  });
});
