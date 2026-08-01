import { expect, test } from "../fixtures/app.fixture";
import { OrdersPage } from "../pages/orders.page";
import { toastWithText } from "../utils/toast";

/**
 * Order cancellation (RFC-0021 P5).
 *
 * Covers the four outcomes the endpoint contract defines — accepted (202),
 * idempotent replay (200), refused (409 + code), and not offered at all — plus
 * the confirmation step this branch requires for destructive actions.
 *
 * Seed state (e2e/mocks/responses/account.responses.ts): ord-1002 is
 * `confirmed` with a pending shipment (cancellable); ord-1001 is `shipped`
 * with the shipment in transit (not cancellable).
 */

test.use({ storageState: "e2e/.auth/user.json" });

const CANCEL_PATH = /\/order\/v1\/private\/orders\/[^/]+\/cancel$/;

test("a dispatched order offers no cancel action", async ({ page }) => {
  const orders = new OrdersPage(page);
  await orders.goto();
  await orders.view("ord-1001");

  await expect(orders.detailsStatus()).toHaveText(/shipped/i);
  await expect(orders.cancelTrigger).toBeHidden();
});

test("cancelling requires confirmation and dismissing sends nothing", async ({
  page,
  contract,
}) => {
  const orders = new OrdersPage(page);
  await orders.goto();
  await orders.view("ord-1002");

  await orders.cancelTrigger.click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toHaveCSS("opacity", "1");
  // Deliberately not "Cancel": two buttons reading "Cancel" next to a
  // "Cancel order" trigger would be ambiguous.
  await dialog.getByRole("button", { name: "Keep order" }).click();
  await expect(dialog).toBeHidden();

  expect(
    contract.calls("POST", CANCEL_PATH),
    "dismissing the dialog must not send a cancel",
  ).toHaveLength(0);
  await expect(orders.detailsStatus()).toHaveText(/confirmed/i);
});

test("confirming cancels the order exactly once and re-reads server state", async ({
  page,
  contract,
}) => {
  contract.expectCall({
    method: "POST",
    path: CANCEL_PATH,
    times: 1,
    headers: { authorization: /^Bearer / },
    label: "order cancel (exactly once)",
  });

  const orders = new OrdersPage(page);
  await orders.goto();
  await orders.view("ord-1002");

  await orders.cancelTrigger.click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Cancel order" })
    .click();

  await expect(toastWithText(page, /is cancelling/i)).toBeVisible();
  // Accepted asynchronously: the order parks in `cancelling`, and both the
  // details panel and the list row must reflect the re-read, not a guess.
  await expect(orders.detailsStatus()).toHaveText(/cancelling/i);
  await expect(orders.row("ord-1002")).toContainText(/cancelling/i);
  await expect(orders.cancelTrigger).toBeHidden();
});

test("cancelling an already-cancelling order replays idempotently", async ({
  page,
}) => {
  const orders = new OrdersPage(page);
  await orders.goto();

  // First cancel moves it to `cancelling`.
  await orders.view("ord-1002");
  await orders.cancelTrigger.click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Cancel order" })
    .click();
  await expect(orders.detailsStatus()).toHaveText(/cancelling/i);

  // A replay from a second surface (the API is idempotent) must not error.
  // Relative path on purpose: the mock dispatcher matches on pathname, so this
  // avoids hardcoding the gateway origin that VITE_API_BASE_URL controls.
  const replay = await page.evaluate(async () => {
    const res = await fetch("/order/v1/private/orders/ord-1002/cancel", {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
    });
    return { status: res.status, body: (await res.json()) as unknown };
  });

  expect(replay.status, "idempotent replay is 200, not 202").toBe(200);
  expect(replay.body).toEqual({ order_id: "ord-1002", status: "cancelling" });
});

test("a refused cancellation shows the mapped warning, not a generic error", async ({
  page,
  contract,
}) => {
  // Force the 409 the seed cannot produce: the UI gate would hide the button
  // for any order the mock backend refuses, so the race the real backend can
  // lose (shipment dispatches between the read and the cancel) is only
  // reachable by overriding the response.
  await page.route(
    (url) => CANCEL_PATH.test(url.pathname),
    async (route) => {
      contract.record(route.request());
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Order can no longer be cancelled",
          code: "SHIPMENT_ALREADY_DISPATCHED",
        }),
      });
    },
  );

  const orders = new OrdersPage(page);
  await orders.goto();
  await orders.view("ord-1002");

  await orders.cancelTrigger.click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Cancel order" })
    .click();

  // The copy comes from CODE_MAP. Without that entry toAppError would collapse
  // a coded 409 to "Something went wrong", so this assertion is what pins the
  // mapping in place.
  await expect(
    toastWithText(page, "This order can no longer be cancelled."),
  ).toBeVisible();
  // The dialog must close even though the action failed — ConfirmAction keeps
  // it open if onConfirm rejects.
  await expect(page.getByRole("alertdialog")).toBeHidden();
});
