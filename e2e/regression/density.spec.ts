import { expect, test } from "../fixtures/app.fixture";
import { ProductDetailPage } from "../pages/product-detail.page";
import { CartPage } from "../pages/cart.page";
import { toastWithText } from "../utils/toast";
import type { Page } from "@playwright/test";

/**
 * Compact-density regression.
 *
 * Locks in the geometry the density refinement was measured against, so a
 * later layout edit that quietly re-inflates the UI fails here instead of
 * being noticed by eye. Everything is asserted from `boundingBox()` and
 * computed style rather than screenshots, so these checks are
 * platform-independent and run everywhere — unlike the visual snapshots,
 * which are CI-Linux-canonical.
 *
 * This spec sets its own viewports, so it belongs to exactly one project.
 */

/** The review matrix from the density plan. */
const VIEWPORTS = [
  { w: 360, h: 800, cols: 2, label: "narrow-mobile" },
  { w: 390, h: 844, cols: 2, label: "mobile" },
  { w: 768, h: 1024, cols: 3, label: "tablet" },
  { w: 1024, h: 768, cols: 3, label: "small-laptop" },
  { w: 1366, h: 768, cols: 4, label: "laptop" },
  { w: 1440, h: 900, cols: 5, label: "desktop" },
  { w: 1920, h: 1080, cols: 6, label: "large-desktop" },
  { w: 2048, h: 1080, cols: 6, label: "ultra-wide" },
] as const;

const GUEST_ROUTES = [
  "/",
  "/products",
  "/products/prod-00001",
  "/login",
  "/no-such-route",
];

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow, `horizontal overflow at ${page.url()}`).toBeLessThanOrEqual(0);
}

/** Distinct row count, derived from how many cards share a top edge. */
async function columnCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll("article")];
    if (cards.length === 0) return 0;
    const firstTop = Math.round(cards[0]!.getBoundingClientRect().top);
    return cards.filter(
      (c) => Math.round(c.getBoundingClientRect().top) === firstTop,
    ).length;
  });
}

for (const vp of VIEWPORTS) {
  // Resolved here, not inside a test body: these are properties of the
  // viewport being generated, so branching on them at run time would be a
  // conditional assertion that could silently skip itself.
  const cardBand = vp.w >= 1024 ? [280, 340] : [180, 340];
  const mediaBand = vp.w >= 768 ? [440, 560] : [0, vp.w - 32];

  test.describe(`density @ ${vp.w}x${vp.h} (${vp.label})`, () => {
    test.use({ viewport: { width: vp.w, height: vp.h } });

    test("no route overflows horizontally", async ({ page }) => {
      for (const route of GUEST_ROUTES) {
        await page.goto(route);
        await expect(page.getByRole("heading").first()).toBeVisible();
        await expectNoHorizontalOverflow(page);
      }
    });

    test("catalog grid holds its column count and card height band", async ({
      page,
    }) => {
      await page.goto("/products");
      await expect(page.getByRole("article").first()).toBeVisible();

      expect(await columnCount(page), "columns").toBe(vp.cols);

      // Desktop carries the band the density contract specifies; narrower
      // viewports get proportionally shorter cards from the same 4:3 media.
      const card = await page.getByRole("article").first().boundingBox();
      expect(card!.height, "card height").toBeGreaterThanOrEqual(cardBand[0]!);
      expect(card!.height, "card height").toBeLessThanOrEqual(cardBand[1]!);

      // Every card in the first row shares a bottom edge, which is what the
      // unconditional two-line title reserve buys.
      const bottoms = await page.evaluate((n) => {
        const cards = [...document.querySelectorAll("article")].slice(0, n);
        return cards.map((c) => Math.round(c.getBoundingClientRect().bottom));
      }, vp.cols);
      expect(new Set(bottoms).size, `row 1 bottoms: ${bottoms.join(",")}`).toBe(1);
    });

    test("product detail keeps its media band and reviews above the fold", async ({
      page,
    }) => {
      await page.goto("/products/prod-00001");
      await expect(page.getByRole("button", { name: "Add to Cart" })).toBeVisible();

      const media = await page
        .locator('[role="img"]')
        .first()
        .boundingBox();
      expect(media!.width, "detail media width").toBeGreaterThanOrEqual(mediaBand[0]!);
      expect(media!.width, "detail media width").toBeLessThanOrEqual(mediaBand[1]!);
      // 4:3, so the media can never again be as tall as it is wide.
      expect(media!.height).toBeLessThan(media!.width);

      const heading = await page
        .getByRole("heading", { name: "Customer Reviews" })
        .boundingBox();
      expect(heading!.y, "reviews heading fold offset").toBeLessThan(vp.h);
    });
  });
}

test.describe("density: empty states and chrome", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("empty states sit in the compact band and stay constrained", async ({
    page,
  }) => {
    await page.goto("/products/prod-00001");
    const reviewsEmpty = page.locator('[data-slot="empty"]').first();
    await expect(reviewsEmpty).toBeVisible();
    const box = await reviewsEmpty.boundingBox();
    expect(box!.height, "no-reviews height").toBeGreaterThanOrEqual(96);
    expect(box!.height, "no-reviews height").toBeLessThanOrEqual(145);

    await page.goto("/no-such-route");
    const notFound = await page.locator('[data-slot="empty"]').boundingBox();
    expect(notFound!.height, "404 height").toBeLessThanOrEqual(180);
    // Previously full-bleed across the whole content width.
    expect(notFound!.width, "404 width").toBeLessThanOrEqual(460);
  });

  test("header and footer stay compact and the header tracks the widest tier", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/products");
    await expect(page.getByRole("article").first()).toBeVisible();

    const header = await page.locator("header").boundingBox();
    expect(header!.height, "header height incl. border").toBeLessThanOrEqual(49);

    const footer = await page.locator("footer").boundingBox();
    expect(footer!.height, "footer height").toBeLessThanOrEqual(60);

    // The brand's left edge lines up with the first card's, because the header
    // renders the same shell tier as the catalog. Compared as content edges:
    // both boxes carry the shell's own horizontal padding.
    const edges = await page.evaluate(() => {
      const headerInner = document.querySelector("header > div")!;
      const grid = document.querySelector("article")!.parentElement!;
      const hs = getComputedStyle(headerInner);
      return {
        header:
          Math.round(headerInner.getBoundingClientRect().left) +
          parseFloat(hs.paddingLeft),
        grid: Math.round(grid.getBoundingClientRect().left),
      };
    });
    expect(edges.header, "header content edge vs first card").toBe(edges.grid);
  });
});

test.describe("density: cart", () => {
  test.use({
    storageState: "e2e/.auth/user.json",
    viewport: { width: 1440, height: 900 },
  });

  test("rows align on a shared grid and the summary sticks", async ({ page }) => {
    const detail = new ProductDetailPage(page);
    await detail.goto("prod-00001");
    await detail.addToCartButton.click();
    await toastWithText(page, "Added to cart").waitFor();

    const cart = new CartPage(page);
    await cart.goto();
    await expect(cart.heading).toBeVisible();

    const row = await cart.itemRow(/each/).first().boundingBox();
    expect(row!.height, "cart row height").toBeLessThanOrEqual(90);

    // The summary is the last card in the split.
    const summary = page.locator('[data-slot="card"]').last();
    const sticky = await summary.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { position: cs.position, top: cs.top, alignSelf: cs.alignSelf };
    });
    expect(sticky.position, "summary position").toBe("sticky");
    // Header 48px + its 1px border + a 16px gutter, from --sticky-top.
    expect(sticky.top, "summary offset").toBe("65px");
    // A stretched grid item cannot stick, so this is load-bearing.
    expect(sticky.alignSelf, "summary align-self").toBe("flex-start");

    const width = (await summary.boundingBox())!.width;
    expect(Math.round(width), "summary track").toBe(320);

    await expectNoHorizontalOverflow(page);
  });

  test("checkout has no stacked card padding and no overflow", async ({ page }) => {
    const detail = new ProductDetailPage(page);
    await detail.goto("prod-00001");
    await detail.addToCartButton.click();
    await toastWithText(page, "Added to cart").waitFor();

    await page.goto("/checkout");
    await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();

    // The stray `pt-6` on top of the Card's own padding is what produced 40px
    // of dead space at the top of every step.
    const pads = await page.evaluate(() =>
      [...document.querySelectorAll('[data-slot="card-content"]')].map((el) =>
        parseFloat(getComputedStyle(el).paddingTop),
      ),
    );
    for (const pad of pads) expect(pad).toBeLessThanOrEqual(12);

    await expectNoHorizontalOverflow(page);
  });

  test("checkout fits 360px wide", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    const detail = new ProductDetailPage(page);
    await detail.goto("prod-00001");
    await detail.addToCartButton.click();
    await toastWithText(page, "Added to cart").waitFor();

    await page.goto("/checkout");
    await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
