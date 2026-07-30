import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "../fixtures/app.fixture";
import { LoginPage } from "../pages/login.page";
import { ProductDetailPage } from "../pages/product-detail.page";
import { CartPage } from "../pages/cart.page";
import { CheckoutPage } from "../pages/checkout.page";
import { toastWithText } from "../utils/toast";
import type { Page } from "@playwright/test";

/**
 * Accessibility regression — axe (wcag2a + wcag2aa) with a hard gate on
 * critical/serious violations, plus keyboard/focus behaviors that automated
 * audits cannot catch.
 */

async function expectNoSeriousViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  const gate = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
  expect(
    gate.map((v) => `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nodes)`),
    "critical/serious axe violations",
  ).toEqual([]);
}

test.describe("axe scans (guest)", () => {
  for (const route of ["/", "/products", "/products/prod-00001", "/login"]) {
    test(`no critical/serious violations on ${route}`, async ({ page }) => {
      await page.goto(route);
      // Anchor on rendered content instead of network-idle heuristics.
      await expect(page.getByRole("heading").first()).toBeVisible();
      await expectNoSeriousViolations(page);
    });
  }

  test("login validation errors stay accessible", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.submitButton.click();
    await expect(page.getByText("Username is required")).toBeVisible();
    await expectNoSeriousViolations(page);
  });
});

test.describe("axe scans (authenticated)", () => {
  test.use({ storageState: "e2e/.auth/user.json" });

  test("no critical/serious violations on cart and checkout", async ({ page }) => {
    const detail = new ProductDetailPage(page);
    await detail.goto("prod-00001");
    await detail.addToCartButton.click();
    await toastWithText(page, "Added to cart").waitFor();

    const cart = new CartPage(page);
    await cart.goto();
    await expect(cart.heading).toBeVisible();
    await expectNoSeriousViolations(page);

    const checkout = new CheckoutPage(page);
    await checkout.goto();
    await expect(checkout.heading).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test("confirmation dialog is accessible while open", async ({ page }) => {
    const detail = new ProductDetailPage(page);
    await detail.goto("prod-00001");
    await detail.addToCartButton.click();
    await toastWithText(page, "Added to cart").waitFor();

    const cart = new CartPage(page);
    await cart.goto();
    await cart.removeButton().click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await expectNoSeriousViolations(page);
  });
});

test.describe("keyboard & focus", () => {
  test("login form is fully keyboard-operable in order", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();

    await login.usernameInput.focus();
    await page.keyboard.type("alice");
    await page.keyboard.press("Tab");
    await expect(login.passwordInput).toBeFocused();
    await page.keyboard.type("password123");
    // Enter submits from within the form.
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/$/);
  });

  test.describe("authenticated", () => {
    test.use({ storageState: "e2e/.auth/user.json" });

    test("confirm dialog traps focus, Escape restores it to the trigger", async ({
      page,
    }) => {
      const detail = new ProductDetailPage(page);
      await detail.goto("prod-00001");
      await detail.addToCartButton.click();
      await toastWithText(page, "Added to cart").waitFor();

      const cart = new CartPage(page);
      await cart.goto();
      const trigger = cart.removeButton();
      await trigger.click();

      const dialog = page.getByRole("alertdialog");
      await expect(dialog).toBeVisible();

      // Tabbing never reaches the background content.
      for (let i = 0; i < 8; i += 1) {
        await page.keyboard.press("Tab");
        const inBackground = await page.evaluate(() => {
          const main = document.querySelector("main");
          const active = document.activeElement;
          const dialogEl = document.querySelector('[role="alertdialog"]');
          return Boolean(
            main && active && main.contains(active) && !dialogEl?.contains(active),
          );
        });
        expect(inBackground, `focus escaped the dialog on Tab #${i + 1}`).toBe(false);
      }

      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
    });
  });
});
