import { expect, test } from "../fixtures/app.fixture";

/**
 * Silent-refresh regression (plan journeys 4 & 5) — the highest-risk area of
 * the client: one refresh per 401 burst (single-flight), retry-once, and the
 * skipAuthRefresh contract for background pollers.
 */
test.use({ storageState: "e2e/.auth/user.json" });

const STALE_TOKEN = "e2e-access-token-0"; // what auth.setup stored
const PRIVATE_PATH = /\/v1\/private\//;
const REFRESH_PATH = /\/auth\/v1\/public\/auth\/refresh$/;

test("a burst of 401s triggers exactly one refresh and retried requests succeed", async ({
  page,
  contract,
}) => {
  // Private calls carrying the STALE token 401; refreshed tokens fall through
  // to the normal dispatcher. This simulates an expired access token.
  await page.route(
    (url) => PRIVATE_PATH.test(url.pathname),
    async (route) => {
      const auth = route.request().headers()["authorization"] ?? "";
      if (auth === `Bearer ${STALE_TOKEN}`) {
        contract.record(route.request());
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ error: "Invalid or expired token" }),
        });
        return;
      }
      await route.fallback();
    },
  );

  // /orders mounts the orders query plus both badge pollers — a genuine
  // burst of concurrent 401s.
  await page.goto("/orders");
  await expect(page.getByText("#ord-1001")).toBeVisible();

  // Single-flight: exactly ONE refresh despite several 401s.
  contract.expectCall({
    method: "POST",
    path: REFRESH_PATH,
    times: 1,
    body: (body) => {
      expect(body).toHaveProperty("refresh_token");
    },
    label: "silent refresh (single-flight)",
  });

  // Retried calls carry the rotated token.
  const retried = contract
    .calls("GET", /\/order\/v1\/private\/orders$/)
    .filter((c) => c.headers["authorization"] === "Bearer e2e-access-token-1");
  expect(retried.length, "orders retried with the rotated token").toBeGreaterThan(0);

  // The rotated pair landed in storage.
  const stored = await page.evaluate(() => localStorage.getItem("authToken"));
  expect(stored).toBe("e2e-access-token-1");
});

test("failed refresh on a foreground call clears the session and redirects to /login", async ({
  page,
  contract,
}) => {
  await page.route(
    (url) => PRIVATE_PATH.test(url.pathname) || REFRESH_PATH.test(url.pathname),
    async (route) => {
      contract.record(route.request());
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Invalid or expired token" }),
      });
    },
  );

  await page.goto("/orders");
  await expect(page).toHaveURL(/\/login\?returnTo=%2Forders/);

  const cleared = await page.evaluate(() => ({
    access: localStorage.getItem("authToken"),
    refresh: localStorage.getItem("authRefreshToken"),
  }));
  expect(cleared).toEqual({ access: null, refresh: null });
});

test("badge poller refresh failure (skipAuthRefresh) never hijacks navigation", async ({
  page,
  contract,
}) => {
  await page.route(
    (url) => PRIVATE_PATH.test(url.pathname) || REFRESH_PATH.test(url.pathname),
    async (route) => {
      contract.record(route.request());
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Invalid or expired token" }),
      });
    },
  );

  // A PUBLIC page whose only private traffic is the badge pollers.
  await page.goto("/products");
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();

  // Pollers fired, refresh failed — and we are still on /products.
  await expect
    .poll(() => contract.calls("GET", /\/cart\/v1\/private\/cart\/count$/).length, {
      timeout: 5_000,
    })
    .toBeGreaterThan(0);
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
});
