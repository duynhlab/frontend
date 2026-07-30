import { expect, test } from "../fixtures/app.fixture";

/**
 * Network-contract regression: the SPA speaks Variant A edge naming to Kong —
 * /{service}/v1/{public|private}/{resource…} — with Bearer on private calls,
 * no /internal audience, and no /api prefix. The global invariants live in
 * NetworkContract.verify(); these specs add the shape/count assertions.
 */

test("route mocks really intercept HTTP (proof of interception)", async ({
  page,
  contract,
}) => {
  await page.goto("/products");
  await expect(page.getByRole("article").first()).toBeVisible();
  // If the app mock were accidentally ON, no HTTP would ever be recorded and
  // a broken axios/Kong path would go unnoticed (plan §17.3 guard).
  expect(contract.totalCalls).toBeGreaterThan(0);
  expect(
    contract.calls("GET", /\/product\/v1\/public\/products$/).length,
  ).toBeGreaterThan(0);
});

test("catalog pagination sends page + page_size query params", async ({
  page,
  contract,
}) => {
  await page.goto("/products?page=2");
  await expect(page.getByText("Page 2 of 2", { exact: true })).toBeVisible();

  const calls = contract.calls("GET", /\/product\/v1\/public\/products$/);
  const page2 = calls.find((c) => c.search.includes("page=2"));
  expect(page2, "expected a catalog request for page=2").toBeTruthy();
  expect(page2?.search).toContain("page_size=24");
});

test.describe("authenticated traffic", () => {
  test.use({ storageState: "e2e/.auth/user.json" });

  test("badge pollers hit their exact endpoints with Bearer tokens", async ({
    page,
    contract,
  }) => {
    await page.goto("/");
    await expect
      .poll(
        () => contract.calls("GET", /\/cart\/v1\/private\/cart\/count$/).length,
        { timeout: 5_000 },
      )
      .toBeGreaterThan(0);
    await expect
      .poll(
        () =>
          contract.calls(
            "GET",
            /\/notification\/v1\/private\/notifications\/count$/,
          ).length,
        { timeout: 5_000 },
      )
      .toBeGreaterThan(0);

    contract.expectCall({
      method: "GET",
      path: /\/cart\/v1\/private\/cart\/count$/,
      headers: { authorization: /^Bearer / },
    });
    contract.expectCall({
      method: "GET",
      path: /\/notification\/v1\/private\/notifications\/count$/,
      headers: { authorization: /^Bearer / },
    });
  });

  test("the product detail page uses the aggregation endpoint exactly once", async ({
    page,
    contract,
  }) => {
    await page.goto("/products/prod-00001");
    await expect(
      page.getByRole("heading", { name: "Wireless Headphones" }),
    ).toBeVisible();

    // Aggregate endpoint — one call, no client-side orchestration of the
    // bare product/review endpoints.
    contract.expectCall({
      method: "GET",
      path: /\/product\/v1\/public\/products\/prod-00001\/details$/,
      times: 1,
    });
    expect(
      contract.calls("GET", /\/product\/v1\/public\/products\/prod-00001$/),
    ).toHaveLength(0);
    expect(contract.calls("GET", /\/review\/v1\/public\/reviews$/)).toHaveLength(0);
  });
});
