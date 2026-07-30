import { expect, test } from "../fixtures/app.fixture";
import { LoginPage } from "../pages/login.page";

/**
 * Navigation regression — deep links, the real 404, the open-redirect guard,
 * and the mobile Sheet's focus behavior (runs in both viewport projects; the
 * sheet test self-skips on desktop where the hamburger is hidden).
 */

test("deep link straight into a product detail renders", async ({ page }) => {
  await page.goto("/products/prod-00002");
  await expect(page.getByRole("heading", { name: "Smart Watch" })).toBeVisible();
});

test("unknown routes render the 404 page instead of silently redirecting", async ({
  page,
}) => {
  await page.goto("/does-not-exist");
  await expect(page.getByText("Page not found")).toBeVisible();
  await page.getByRole("link", { name: "Go home" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("returnTo open-redirect guard keeps navigation inside the app", async ({
  page,
}) => {
  for (const evil of [
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
  ]) {
    const login = new LoginPage(page);
    await page.goto(`/login?returnTo=${encodeURIComponent(evil)}`);
    await login.login();
    // Rejected returnTo falls back to "/" — never leaves the origin.
    await expect(page).toHaveURL(/\/$/);
    await page.evaluate(() => localStorage.clear());
  }
});

test.describe("authenticated", () => {
  test.use({ storageState: "e2e/.auth/user.json" });

  test("the retired /checkout/legacy path redirects into the funnel", async ({
    page,
  }) => {
    await page.goto("/checkout/legacy");
    await expect(page).toHaveURL(/\/checkout$/);
  });

  test("mobile sheet navigation traps focus and closes on Escape", async ({
    page,
  }) => {
    await page.goto("/");
    const hamburger = page.getByRole("button", { name: "Open menu" });
    test.skip(!(await hamburger.isVisible()), "desktop viewport has no hamburger");

    await hamburger.click();
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("link", { name: "Products" })).toBeVisible();

    // The trap's meaningful property: tabbing never reaches the content
    // behind the sheet (Base UI parks focus on its own guards between
    // wraps, which live outside the dialog element — so we assert against
    // the background, not dialog membership).
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press("Tab");
      const inBackground = await page.evaluate(() => {
        const main = document.querySelector("main");
        const header = document.querySelector("header");
        const active = document.activeElement;
        return Boolean(
          (main && main.contains(active)) || (header && header.contains(active)),
        );
      });
      expect(inBackground, `focus escaped to the page on Tab #${i + 1}`).toBe(false);
    }

    // Escape closes and focus returns to the trigger.
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(hamburger).toBeFocused();
  });
});
