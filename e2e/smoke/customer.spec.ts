import { expect, test } from "../fixtures/app.fixture";
import { ProductDetailPage } from "../pages/product-detail.page";
import { CartPage } from "../pages/cart.page";
import { toastWithText } from "../utils/toast";
import { openMainNav } from "../utils/nav";

test.use({ storageState: "e2e/.auth/user.json" });

test.describe("Customer journey", () => {
  test("shows protected nav links when logged in", async ({ page }) => {
    await page.goto("/");
    const nav = await openMainNav(page);
    await expect(nav.getByRole("link", { name: "Cart" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Orders" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Profile" })).toBeVisible();
    await expect(nav.getByRole("button", { name: "Logout" })).toBeVisible();
  });

  test("adds to cart, updates quantity, and removes with confirmation", async ({
    page,
    contract,
  }) => {
    const detail = new ProductDetailPage(page);
    await detail.goto("prod-00001");
    await detail.addToCartButton.click();
    await expect(toastWithText(page, "Added to cart")).toBeVisible();

    const cart = new CartPage(page);
    await cart.goto();
    await expect(cart.heading).toBeVisible();
    await expect(
      page.getByText("Wireless Headphones", { exact: true }),
    ).toBeVisible();

    // Quantity up via the stepper — PATCH must actually fire (contract).
    await page.getByRole("button", { name: "Increase quantity" }).click();
    await expect(page.getByLabel("Quantity:")).toHaveValue("2");

    // Remove requires confirmation; cancel keeps the item.
    await cart.removeButton().click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(
      page.getByText("Wireless Headphones", { exact: true }),
    ).toBeVisible();

    // Confirm actually removes and toasts.
    await cart.removeButton().click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Remove", exact: true })
      .click();
    await expect(toastWithText(page, "Removed from cart")).toBeVisible();
    await expect(page.getByText("Your cart is empty")).toBeVisible();

    contract.expectCall({
      method: "POST",
      path: /\/cart\/v1\/private\/cart$/,
      times: 1,
      headers: { authorization: /^Bearer / },
    });
    contract.expectCall({
      method: "PATCH",
      path: /\/cart\/v1\/private\/cart\/items\/[^/]+$/,
      body: (body) => {
        expect(body).toMatchObject({ quantity: 2 });
      },
    });
    contract.expectCall({
      method: "DELETE",
      path: /\/cart\/v1\/private\/cart\/items\/[^/]+$/,
      times: 1,
    });
  });

  test("orders, notifications and profile pages render", async ({ page }) => {
    await page.goto("/orders");
    await expect(page.getByRole("heading", { name: "My Orders" })).toBeVisible();
    await expect(page.getByText("#ord-1001")).toBeVisible();

    await page.goto("/notifications");
    await expect(
      page.getByRole("heading", { name: "Notifications", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Order shipped" }),
    ).toBeVisible();

    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: "My Profile" })).toBeVisible();
    await expect(page.getByText("Alice E2E", { exact: true })).toBeVisible();
  });

  test("logout clears the session and returns to login", async ({ page, contract }) => {
    await page.goto("/");
    const nav = await openMainNav(page);
    await nav.getByRole("button", { name: "Logout" }).click();
    await expect(page).toHaveURL(/\/login$/);

    contract.expectCall({
      method: "POST",
      path: /\/auth\/v1\/public\/auth\/logout$/,
      times: 1,
      body: (body) => {
        expect(body).toHaveProperty("refresh_token");
      },
    });
  });
});
