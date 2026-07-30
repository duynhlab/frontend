import { expect, test, type Page, type Request } from "@playwright/test";

/**
 * GATEWAY SMOKE — the no-mock integration gate (plan §13.7.1).
 *
 * Runs serially against a deployed frontend + real Kong. NO app mock, NO
 * route fulfillment (lint-enforced): the network layer is observed, never
 * altered. Mandatory before production cutover.
 *
 * Env contract (see playwright.gateway.config.ts): E2E_BASE_URL,
 * E2E_GATEWAY_URL, E2E_GATEWAY_USERNAME/PASSWORD (dedicated test account —
 * NEVER production credentials), optional E2E_GATEWAY_CHECKOUT=submit.
 */
test.describe.configure({ mode: "serial" });

const GATEWAY_URL = process.env.E2E_GATEWAY_URL as string;
const USERNAME = process.env.E2E_GATEWAY_USERNAME ?? "";
const PASSWORD = process.env.E2E_GATEWAY_PASSWORD ?? "";
const CHECKOUT_MODE = process.env.E2E_GATEWAY_CHECKOUT === "submit" ? "submit" : "readonly";
/** Identifies this run's data (e.g. profile suffix) for later cleanup. */
const RUN_ID = `e2e-${process.env.GITHUB_RUN_ID ?? process.pid}`;

interface ObservedCall {
  method: string;
  url: URL;
  headers: Record<string, string>;
}

/** Observation-only recorder — no route interception of any kind. */
class GatewayObserver {
  readonly calls: ObservedCall[] = [];
  private readonly errors: string[] = [];

  attach(page: Page): void {
    page.on("request", (request: Request) => {
      const url = new URL(request.url());
      if (url.origin === new URL(GATEWAY_URL).origin) {
        this.calls.push({ method: request.method(), url, headers: request.headers() });
      }
    });
    page.on("pageerror", (error) => this.errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") this.errors.push(message.text());
    });
  }

  verifyInvariants(): void {
    for (const call of this.calls) {
      expect
        .soft(call.url.pathname, "Variant A path shape")
        .toMatch(/^\/(auth|product|cart|order|review|user|notification|checkout|shipping)\/v1\/(public|private)\//);
      expect.soft(call.url.pathname).not.toMatch(/\/internal\//);
      expect.soft(call.url.pathname).not.toMatch(/^\/api\//);
      if (call.url.pathname.includes("/v1/private/")) {
        expect
          .soft(call.headers["authorization"] ?? "", `Bearer on ${call.url.pathname}`)
          .toMatch(/^Bearer .+/);
      }
    }
    expect.soft(this.errors, "runtime/console errors during the journey").toEqual([]);
  }

  count(method: string, path: RegExp): number {
    return this.calls.filter((c) => c.method === method && path.test(c.url.pathname)).length;
  }
}

const observer = new GatewayObserver();

test.beforeEach(({ page }) => {
  observer.attach(page);
});

test("CORS preflight allows the app origin on a private mutating route", async ({
  playwright,
  baseURL,
}) => {
  const api = await playwright.request.newContext();
  const response = await api.fetch(`${GATEWAY_URL}/cart/v1/private/cart`, {
    method: "OPTIONS",
    headers: {
      Origin: baseURL!,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "authorization,content-type,idempotency-key",
    },
  });
  expect(response.status(), "preflight status").toBeLessThan(300);
  const allowOrigin = response.headers()["access-control-allow-origin"];
  expect([baseURL, "*"], "Access-Control-Allow-Origin").toContain(allowOrigin);
  await api.dispose();
});

test("app really starts against the gateway (no mock mode)", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-api-mode", "http");
});

test("login stores a rotating token pair and private calls carry it", async ({ page }) => {
  test.skip(!USERNAME || !PASSWORD, "E2E_GATEWAY_USERNAME/PASSWORD not provided");

  await page.goto("/login");
  await page.getByLabel("Username").fill(USERNAME);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));

  const tokens = await page.evaluate(() => ({
    access: localStorage.getItem("authToken"),
    refresh: localStorage.getItem("authRefreshToken"),
  }));
  expect(tokens.access).toBeTruthy();
  expect(tokens.refresh).toBeTruthy();

  await page.goto("/orders");
  await expect(page.getByRole("heading", { name: "My Orders" })).toBeVisible();
  expect(observer.count("GET", /\/order\/v1\/private\/orders$/)).toBeGreaterThan(0);
});

test("catalog and product detail render real data via the aggregate", async ({ page }) => {
  await page.goto("/products");
  await expect(page.getByRole("article").first()).toBeVisible();

  await page.getByRole("article").first().getByRole("link").first().click();
  await expect(page.getByRole("button", { name: "Add to Cart" })).toBeVisible();
  expect(
    observer.count("GET", /\/product\/v1\/public\/products\/[^/]+\/details$/),
  ).toBeGreaterThan(0);
});

test("cart add/update/remove round-trips and cleans up after itself", async ({ page }) => {
  test.skip(!USERNAME || !PASSWORD, "E2E_GATEWAY_USERNAME/PASSWORD not provided");

  await page.goto("/products");
  await page.getByRole("article").first().getByRole("link").first().click();
  await page.getByRole("button", { name: "Add to Cart" }).click();
  await expect(
    page.getByRole("region", { name: "Notifications" }).getByText("Added to cart"),
  ).toBeVisible();

  await page.goto("/cart");
  await page.getByRole("button", { name: "Increase quantity" }).first().click();
  await expect(page.getByLabel("Quantity:").first()).toHaveValue("2");

  // Cleanup: remove what this run added so reruns stay deterministic.
  await page
    .getByRole("button", { name: "Remove", exact: true })
    .and(page.locator('[aria-haspopup="dialog"]'))
    .first()
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Remove", exact: true })
    .click();
  await expect(page.getByText("Your cart is empty")).toBeVisible();

  expect(observer.count("POST", /\/cart\/v1\/private\/cart$/)).toBeGreaterThan(0);
  expect(
    observer.count("DELETE", /\/cart\/v1\/private\/cart\/items\/[^/]+$/),
  ).toBeGreaterThan(0);
});

test("an expired access token silently refreshes exactly once", async ({ page }) => {
  test.skip(!USERNAME || !PASSWORD, "E2E_GATEWAY_USERNAME/PASSWORD not provided");

  // Corrupt only the ACCESS token; the refresh token stays valid, so the
  // interceptor must rotate the pair and retry.
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("authToken", "expired-garbage-token");
  });

  const refreshesBefore = observer.count("POST", /\/auth\/v1\/public\/auth\/refresh$/);
  await page.goto("/orders");
  await expect(page.getByRole("heading", { name: "My Orders" })).toBeVisible();

  const refreshes =
    observer.count("POST", /\/auth\/v1\/public\/auth\/refresh$/) - refreshesBefore;
  expect(refreshes, "exactly one refresh for the 401 burst").toBe(1);

  const rotated = await page.evaluate(() => localStorage.getItem("authToken"));
  expect(rotated).not.toBe("expired-garbage-token");
});

test(`checkout funnel (${CHECKOUT_MODE} mode)`, async ({ page }) => {
  test.skip(!USERNAME || !PASSWORD, "E2E_GATEWAY_USERNAME/PASSWORD not provided");

  await page.goto("/products");
  await page.getByRole("article").first().getByRole("link").first().click();
  await page.getByRole("button", { name: "Add to Cart" }).click();
  await page.goto("/checkout");

  await page.getByLabel("Full name *").fill(`Gateway Smoke ${RUN_ID}`);
  await page.getByLabel("Address line 1 *").fill("1 Integration Street");
  await page.getByLabel("City *").fill("Hanoi");
  await page.getByLabel("Country code *").fill("VN");
  await page.getByRole("button", { name: "Continue to shipping" }).click();
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await page.getByRole("button", { name: "Review order" }).click();
  await expect(page.getByRole("button", { name: /Place order/ })).toBeEnabled();

  if (CHECKOUT_MODE === "submit") {
    // One idempotent submit; requires backend-confirmed cleanup/idempotency.
    await page.getByRole("button", { name: /Place order/ }).click();
    await expect(page.getByRole("heading", { name: "Order placed!" })).toBeVisible();
    expect(
      observer.count("POST", /\/checkout\/v1\/private\/checkout\/sessions\/[^/]+\/confirm$/),
    ).toBe(1);
  } else {
    // HONEST GAP (plan §13.7.1): without confirmed idempotency/cleanup we
    // stop before submit and cancel the session instead.
    test
      .info()
      .annotations.push({
        type: "gap",
        description:
          "checkout submit skipped: no backend cleanup/idempotency guarantee confirmed (E2E_GATEWAY_CHECKOUT=readonly)",
      });
    await page.getByRole("button", { name: "Cancel checkout" }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Cancel checkout" })
      .click();
    await expect(page).toHaveURL(/\/cart$/);
  }
});

test("logout revokes the family and clears local state", async ({ page }) => {
  test.skip(!USERNAME || !PASSWORD, "E2E_GATEWAY_USERNAME/PASSWORD not provided");

  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main" }).first();
  await nav.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(observer.count("POST", /\/auth\/v1\/public\/auth\/logout$/)).toBeGreaterThan(0);

  const cleared = await page.evaluate(() => localStorage.getItem("authToken"));
  expect(cleared).toBeNull();
});

test("network invariants and runtime cleanliness across the whole run", () => {
  observer.verifyInvariants();
  expect(observer.calls.length, "the run exercised the gateway").toBeGreaterThan(0);
});
