import { expect, test } from "./fixtures";

/**
 * Mock-mode smoke — protects VITE_USE_MOCK=true local/offline development.
 * One representative journey per surface; the full regression suite is NOT
 * duplicated here (AGENTS.md). The in-app mock store is per-page-load, so the
 * journey navigates via in-app links (SPA routing), never full reloads.
 */

test("app really started in mock mode (tripwire)", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-api-mode", "mock");
});

test("catalog renders seeded products and paginates", async ({ page }) => {
  await page.goto("/products");
  await expect(page.getByRole("article")).toHaveCount(24);
  await expect(page.getByText("Page 1 of 2", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Go to next page" }).click();
  await expect(page.getByText("Page 2 of 2", { exact: true })).toBeVisible();
});

test("demo journey: login → add to cart → checkout with save10 → account pages", async ({
  page,
}) => {
  // Login with the demo account (in-app mock credentials).
  await page.goto("/login");
  await page.getByLabel("Username").fill("alice");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Notifications" }).getByText("Welcome back"),
  ).toBeVisible();

  // SPA-navigate (a reload would reset the in-memory store).
  const nav = page.getByRole("navigation", { name: "Main" }).first();
  await nav.getByRole("link", { name: "Products" }).click();
  await page.getByRole("article").getByRole("link", { name: "Wireless Headphones" }).click();
  await page.getByRole("button", { name: "Add to Cart" }).click();
  await expect(
    page.getByRole("region", { name: "Notifications" }).getByText("Added to cart"),
  ).toBeVisible();

  // Cart shows the item and its badge.
  await nav.getByRole("link", { name: "Cart" }).click();
  await expect(page.getByText("Wireless Headphones", { exact: true })).toBeVisible();

  // Checkout happy path with the seeded promo.
  await nav.getByRole("link", { name: "Checkout" }).click();
  await page.getByLabel("Full name *").fill("Alice Demo");
  await page.getByLabel("Address line 1 *").fill("1 Demo Street");
  await page.getByLabel("City *").fill("Hanoi");
  await page.getByRole("button", { name: "Continue to shipping" }).click();
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await page.getByRole("button", { name: "Review order" }).click();
  await page.getByLabel("Promo code").fill("save10");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText(/Discount \(SAVE10\)/i)).toBeVisible();
  await page.getByRole("button", { name: /Place order/ }).click();
  await expect(page.getByRole("heading", { name: "Order placed!" })).toBeVisible();

  // Account surfaces render from the mock store.
  await nav.getByRole("link", { name: "Orders" }).click();
  await expect(page.getByRole("heading", { name: "My Orders" })).toBeVisible();

  // Cancel the seeded cancellable order — the one write the orders module
  // owns, and the only thing that exercises mockCancelOrder offline.
  await page
    .getByRole("row")
    .filter({ hasText: "#ord-1002" })
    .getByRole("button", { name: "View" })
    .click();
  await page
    .getByRole("button", { name: "Cancel order", exact: true })
    .and(page.locator('[aria-haspopup="dialog"]'))
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Cancel order" })
    .click();
  await expect(page.getByRole("row").filter({ hasText: "#ord-1002" })).toContainText(
    /cancelling/i,
  );

  await nav.getByRole("link", { name: /Notifications/ }).click();
  await expect(page.getByRole("heading", { name: "Order placed" })).toBeVisible();
  await nav.getByRole("link", { name: "Profile" }).click();
  await expect(page.getByText("Alice Demo", { exact: true })).toBeVisible();
});
