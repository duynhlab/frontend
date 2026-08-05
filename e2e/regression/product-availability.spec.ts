import { expect, test } from "../fixtures/app.fixture";
import { ProductDetailPage } from "../pages/product-detail.page";
import type { ProductDetails } from "@/api/types/product";

/**
 * Inventory-sourced availability (RFC-0021).
 *
 * Before this spec, availability had no coverage at all: the seed's stock
 * derivation never returned 0, so `available` was always true and the
 * out-of-stock UI was unreachable. The reserved fixtures make each state
 * addressable — see `productStockFor` / `availabilityFor` in
 * `src/api/mock/seed-constants.ts`.
 *
 *   prod-00001  in_stock       prod-00046  out_of_stock
 *   prod-00047  low_stock      prod-00048  unknown
 *
 * The two fallback cases need response overrides, because the fixtures always
 * send `availability` — they cover a product build older than the enrichment,
 * and the state after the frozen `stock` block is removed.
 */

const DETAILS_PATH = /\/product\/v1\/public\/products\/[^/]+\/details$/;

test("in stock shows the promised quantity and allows purchase", async ({ page }) => {
  const detail = new ProductDetailPage(page);
  await detail.goto("prod-00001");

  await expect(detail.availabilityLine).toHaveText("In Stock (10)");
  await expect(detail.addToCartButton).toBeEnabled();
});

test("low stock is distinguishable and still purchasable", async ({ page }) => {
  const detail = new ProductDetailPage(page);
  await detail.goto("prod-00047");

  await expect(detail.availabilityLine).toHaveText("Low Stock (3)");
  await expect(detail.addToCartButton).toBeEnabled();
  // available_to_promise clamps the stepper, so the 4th unit is unreachable.
  await detail.increaseQuantity.click();
  await detail.increaseQuantity.click();
  await expect(detail.quantityInput).toHaveValue("3");
  await expect(detail.increaseQuantity).toBeDisabled();
});

test("out of stock blocks purchase", async ({ page }) => {
  const detail = new ProductDetailPage(page);
  await detail.goto("prod-00046");

  await expect(detail.availabilityLine).toHaveText("Out of Stock");
  await expect(detail.addToCartButton).toBeDisabled();
});

test("unknown availability neither claims a quantity nor blocks the customer", async ({
  page,
}) => {
  const detail = new ProductDetailPage(page);
  await detail.goto("prod-00048");

  // Never "In Stock" or "Out of Stock": inventory soft-fails to unknown when it
  // cannot be reached, and guessing either way would turn a degraded read into
  // a claim about the customer's order.
  await expect(detail.availabilityLine).toHaveText("Availability unknown");
  // No figure — available_to_promise is omitted, not zeroed, on this answer.
  await expect(detail.availabilityLine).not.toHaveText(/\d/);
  // Refusing the sale would be the same guess the label refuses to make; the
  // server re-checks at add-to-cart and again at checkout confirm.
  await expect(detail.addToCartButton).toBeEnabled();
});

test("falls back to the frozen stock block when inventory is absent", async ({
  page,
  contract,
}) => {
  // A product build older than the inventory enrichment: `stock`, no `availability`.
  await page.route(
    (url) => DETAILS_PATH.test(url.pathname),
    async (route) => {
      contract.record(route.request());
      const body: ProductDetails = {
        product: {
          id: "prod-00001",
          name: "Wireless Headphones",
          price: 9.99,
          description: "Legacy build.",
          stock: 7,
        },
        stock: { available: true, quantity: 7 },
        reviews: [],
      };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    },
  );

  const detail = new ProductDetailPage(page);
  await detail.goto("prod-00001");

  await expect(detail.availabilityLine).toHaveText("In Stock (7)");
  await expect(detail.addToCartButton).toBeEnabled();
});

test("survives a details payload carrying neither source", async ({
  page,
  contract,
}) => {
  // The state after the frozen `stock` block is removed server-side. Main's
  // implementation gates on `data.stock?.available`, so this payload would
  // disable Add to Cart for every product in the catalogue.
  await page.route(
    (url) => DETAILS_PATH.test(url.pathname),
    async (route) => {
      contract.record(route.request());
      const body: ProductDetails = {
        product: {
          id: "prod-00001",
          name: "Wireless Headphones",
          price: 9.99,
          description: "No availability source.",
          stock: 0,
        },
        reviews: [],
      };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    },
  );

  const detail = new ProductDetailPage(page);
  await detail.goto("prod-00001");

  // Nothing is claimed, rather than an empty line or a wrong claim.
  await expect(detail.availabilityLine).toBeHidden();
  await expect(detail.addToCartButton).toBeEnabled();
});
