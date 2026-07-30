import { expect, test } from "../fixtures/app.fixture";
import { HomePage } from "../pages/home.page";
import { ProductListPage } from "../pages/products.page";
import { ProductDetailPage } from "../pages/product-detail.page";
import { LoginPage } from "../pages/login.page";
import { toastWithText } from "../utils/toast";

test.describe("Guest journey", () => {
  test("shows hero and navigates to products via CTA", async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await expect(home.heroTitle).toBeVisible();
    await home.browseCta.click();
    await expect(page).toHaveURL(/\/products$/);
    await expect(new ProductListPage(page).heading).toBeVisible();
  });

  test("renders the mocked catalog with pagination", async ({ page }) => {
    const products = new ProductListPage(page);
    await products.goto();
    await expect(products.heading).toBeVisible();
    await expect(products.productCards).toHaveCount(24);
    await expect(products.productLink("Wireless Headphones")).toBeVisible();
    await expect(products.productLink("Smart Watch")).toBeVisible();

    await expect(page.getByText("Page 1 of 2", { exact: true })).toBeVisible();
    await products.nextPage.click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText("Page 2 of 2", { exact: true })).toBeVisible();
    await expect(products.productLink(/Ergonomic Chair/)).toBeVisible();
  });

  test("redirects unauthenticated users from /cart to login", async ({ page }) => {
    await page.goto("/cart");
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fcart/);
    await expect(
      page.getByRole("heading", { name: "Login", exact: true }),
    ).toBeVisible();
  });

  test("guest add-to-cart intent survives the login redirect", async ({
    page,
    contract,
  }) => {
    // Guest browses to a product…
    const detail = new ProductDetailPage(page);
    await detail.goto("prod-00001");
    await expect(detail.addToCartButton).toBeVisible();

    // …is bounced to login from a protected page, logs in, and returns.
    await page.goto("/cart");
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fcart/);
    await new LoginPage(page).login();
    await expect(page).toHaveURL(/\/cart$/);
    await expect(toastWithText(page, "Welcome back")).toBeVisible();

    contract.expectCall({
      method: "POST",
      path: /\/auth\/v1\/public\/auth\/login$/,
      times: 1,
      body: (body) => {
        expect(body).toMatchObject({ username: "alice" });
      },
    });
  });
});
