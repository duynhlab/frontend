import { expect, test } from "../fixtures/app.fixture";
import { LoginPage } from "../pages/login.page";
import { CheckoutPage } from "../pages/checkout.page";
import { ProductDetailPage } from "../pages/product-detail.page";
import { toastWithText } from "../utils/toast";

/**
 * Form regression — RHF + Zod validation for the merge-gate forms (login and
 * checkout address). Validation errors are inline/field-level, never toasts.
 */

test.describe("login form", () => {
  test("empty submit shows field errors and fires no request", async ({
    page,
    contract,
  }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.submitButton.click();

    await expect(page.getByText("Username is required")).toBeVisible();
    await expect(page.getByText("Password is required")).toBeVisible();
    await expect(login.usernameInput).toHaveAttribute("aria-invalid", "true");

    expect(
      contract.calls("POST", /\/auth\/v1\/public\/auth\/login$/),
    ).toHaveLength(0);
  });

  test("wrong password renders an inline alert, not a toast", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login("alice", "wrong-password");

    const alert = page.getByRole("alert").filter({
      hasText: "Invalid username or password",
    });
    await expect(alert).toBeVisible();
    await expect(
      toastWithText(page, "Invalid username or password"),
    ).toBeHidden();
  });

  test("register mode validates email format and password length", async ({
    page,
  }) => {
    await page.goto("/login?mode=register");
    await page.getByLabel("Username").fill("bo");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password").fill("short");
    await page.getByRole("button", { name: "Register", exact: true }).click();

    await expect(
      page.getByText("Username must be at least 3 characters"),
    ).toBeVisible();
    await expect(
      page.getByText("Please enter a valid email address"),
    ).toBeVisible();
    await expect(
      page.getByText("Password must be at least 8 characters"),
    ).toBeVisible();
  });
});

test.describe("checkout address form", () => {
  test.use({ storageState: "e2e/.auth/user.json" });

  test("required fields and the 2-letter country rule validate inline", async ({
    page,
  }) => {
    const detail = new ProductDetailPage(page);
    await detail.goto("prod-00001");
    await detail.addToCartButton.click();
    await toastWithText(page, "Added to cart").waitFor();

    const checkout = new CheckoutPage(page);
    await checkout.goto();
    await expect(checkout.heading).toBeVisible();

    // Clear the prefilled country and submit an empty form.
    await page.getByLabel("Country code *").fill("");
    await checkout.continueToShipping.click();
    await expect(page.getByText("Full name is required")).toBeVisible();
    await expect(page.getByText("Address line 1 is required")).toBeVisible();
    await expect(page.getByText("City is required")).toBeVisible();
    await expect(
      page.getByText("Use the 2-letter country code (e.g. VN)"),
    ).toBeVisible();

    // Fixing the fields clears the errors and advances the funnel.
    await checkout.fillAddress();
    await checkout.continueToShipping.click();
    await expect(
      page.getByRole("button", { name: "Continue to payment" }),
    ).toBeVisible();
  });
});
