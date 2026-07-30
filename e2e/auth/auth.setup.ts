import { test as setup } from "../fixtures/app.fixture";
import { LoginPage } from "../pages/login.page";

/**
 * Authenticates once through the real UI (against route mocks) and persists
 * the localStorage token state for the authenticated projects.
 */
setup("authenticate", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 10_000,
  });
  await page.context().storageState({ path: "e2e/.auth/user.json" });
});
