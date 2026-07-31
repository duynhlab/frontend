#!/usr/bin/env node
/**
 * Density measurement harness — before/after evidence for the compact refinement.
 *
 * Records the numbers the density acceptance criteria are written against:
 * product-grid columns and card geometry, empty-state heights, product-detail
 * media size and the reviews-heading fold offset, plus horizontal-overflow and
 * key control heights — across every viewport in the review matrix.
 *
 * Usage:
 *   VITE_USE_MOCK=true npm run dev -- --port 3300 --strictPort &
 *   node scripts/density/measure.mjs [--base http://localhost:3300] [--out FILE] [--json]
 *
 * Protected routes are reached by logging in through the real UI with the
 * seeded demo account — no auth bypass.
 */
import { writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const BASE = flag("base", "http://localhost:3300");
const OUT = flag("out", null);
const AS_JSON = args.includes("--json");

const VIEWPORTS = [
  { w: 360, h: 800, label: "narrow-mobile" },
  { w: 390, h: 844, label: "mobile" },
  { w: 768, h: 1024, label: "tablet" },
  { w: 1024, h: 768, label: "small-laptop" },
  { w: 1366, h: 768, label: "laptop" },
  { w: 1440, h: 900, label: "desktop" },
  { w: 1920, h: 1080, label: "large-desktop" },
  { w: 2048, h: 1080, label: "ultra-wide" },
];

const round = (n) => (typeof n === "number" ? Math.round(n) : n);

/** Grid + card geometry on /products. */
const measureGrid = () => {
  const cards = [...document.querySelectorAll("article")];
  const first = cards[0]?.getBoundingClientRect();
  const grid = cards[0]?.parentElement;
  const gs = grid ? getComputedStyle(grid) : null;
  const media = cards[0]?.querySelector("svg,img,[role=img]")?.closest("div")?.getBoundingClientRect();
  return {
    cols: gs ? gs.gridTemplateColumns.split(/\s+/).filter(Boolean).length : null,
    gap: gs?.gap ?? null,
    cardW: first?.width ?? null,
    cardH: first?.height ?? null,
    mediaH: media?.height ?? null,
    cardsInFold: cards.filter((c) => c.getBoundingClientRect().top < window.innerHeight).length,
    scrollW: document.documentElement.scrollWidth,
    innerW: window.innerWidth,
  };
};

/** Product-detail media + the reviews-heading fold offset. */
const measureDetail = () => {
  const media = document.querySelector("main svg,main img,main [role=img]")?.closest("div")?.getBoundingClientRect();
  const reviews = [...document.querySelectorAll("h2")]
    .find((h) => /customer reviews/i.test(h.textContent ?? ""))
    ?.getBoundingClientRect();
  return {
    mediaW: media?.width ?? null,
    mediaH: media?.height ?? null,
    reviewsHeadingTop: reviews?.top ?? null,
    reviewsAboveFold: reviews ? reviews.top < window.innerHeight : null,
    pageH: document.body.scrollHeight,
    scrollW: document.documentElement.scrollWidth,
    innerW: window.innerWidth,
  };
};

/** Every EmptyState on the current page. */
const measureEmpties = () =>
  [...document.querySelectorAll("[data-slot=empty]")].map((e) => ({
    text: (e.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 44),
    w: e.getBoundingClientRect().width,
    h: e.getBoundingClientRect().height,
  }));

/** Control heights + shell chrome, for the "already compliant" guardrail. */
const measureChrome = () => {
  const pick = (sel) => {
    const r = document.querySelector(sel)?.getBoundingClientRect();
    return r ? { w: r.width, h: r.height } : null;
  };
  return {
    header: pick("header"),
    footer: pick("footer"),
    button: pick("button[data-slot=button]") ?? pick("button"),
    input: pick("input[data-slot=input]") ?? pick("input"),
    shellW: pick("main > div")?.w ?? null,
    scrollW: document.documentElement.scrollWidth,
    innerW: window.innerWidth,
  };
};

async function login(page) {
  await page.goto(`${BASE}/login`);
  await page.waitForSelector("input#login-username");
  await page.fill("input#login-username", "alice");
  await page.fill("input#login-password", "password123");
  await page.click("button[type=submit]");
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 10_000 });
}

/**
 * Viewport-aware SPA navigation: below `md` the desktop nav is hidden and the
 * links live inside the hamburger Sheet. Mirrors e2e/utils/nav.ts.
 */
async function navClick(page, name) {
  const hamburger = page.getByRole("button", { name: "Open menu" });
  if (await hamburger.isVisible()) {
    await hamburger.click();
    const sheet = page.getByRole("dialog");
    await sheet.getByRole("link", { name }).click();
    await page.waitForTimeout(250); // sheet close transition
    return;
  }
  await page.getByRole("navigation", { name: "Main" }).first().getByRole("link", { name }).click();
}

/**
 * Seeds one cart item via SPA navigation (a reload would reset the mock store).
 *
 * The trailing wait is load-bearing: ProductDetailPage invalidates the
 * `cart-count` SWR key but NOT `cart`, so revisiting /cart inside
 * useApiQuery's 2s `dedupingInterval` serves a stale empty list. Waiting past
 * the window makes the measurement reflect the real cart.
 */
async function seedCart(page) {
  await navClick(page, "Products");
  await page.waitForSelector("article");
  await page.click("article >> nth=0 >> a");
  await page.waitForSelector('button:has-text("Add to Cart")');
  await page.click('button:has-text("Add to Cart")');
  await page.waitForTimeout(2400);
}

const results = { base: BASE, capturedAt: new Date().toISOString(), viewports: {} };

const browser = await chromium.launch();
try {
  for (const vp of VIEWPORTS) {
    const bucket = {};
    const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });

    // ---- public routes ----
    await page.goto(`${BASE}/products`);
    await page.waitForSelector("article", { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(350);
    bucket.grid = await page.evaluate(measureGrid);
    bucket.chrome = await page.evaluate(measureChrome);

    await page.goto(`${BASE}/products/prod-00001`);
    await page.waitForSelector('button:has-text("Add to Cart")', { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(350);
    bucket.detail = await page.evaluate(measureDetail);
    bucket.detailEmpties = await page.evaluate(measureEmpties);

    await page.goto(`${BASE}/nope-not-a-route`);
    await page.waitForTimeout(300);
    bucket.notFoundEmpties = await page.evaluate(measureEmpties);

    // ---- protected routes (real login) ----
    await login(page);
    await navClick(page, "Cart").catch(() => {});
    await page.waitForTimeout(500);
    bucket.cartEmptyEmpties = await page.evaluate(measureEmpties);

    await seedCart(page);
    await navClick(page, "Cart");
    await page.waitForTimeout(600);
    bucket.cartFilled = await page.evaluate(() => {
      const rows = [...document.querySelectorAll("[data-slot=card-content] li")].filter((d) =>
        /each/.test(d.textContent ?? ""),
      );
      const cards = [...document.querySelectorAll("[data-slot=card]")];
      return {
        rowH: rows[0]?.getBoundingClientRect().height ?? null,
        cardH: cards.map((c) => c.getBoundingClientRect().height),
        cardW: cards.map((c) => c.getBoundingClientRect().width),
        scrollW: document.documentElement.scrollWidth,
        innerW: window.innerWidth,
      };
    });

    await navClick(page, "Checkout").catch(() => {});
    await page.waitForTimeout(700);
    bucket.checkout = await page.evaluate(() => {
      const cards = [...document.querySelectorAll("[data-slot=card]")];
      const fields = [...document.querySelectorAll("[data-slot=field]")];
      return {
        cardH: cards.map((c) => c.getBoundingClientRect().height),
        cardW: cards.map((c) => c.getBoundingClientRect().width),
        fieldH: fields[0]?.getBoundingClientRect().height ?? null,
        fieldCount: fields.length,
        scrollW: document.documentElement.scrollWidth,
        innerW: window.innerWidth,
      };
    });

    for (const [route, key] of [
      ["/orders", "orders"],
      ["/notifications", "notifications"],
      ["/profile", "profile"],
    ]) {
      await page.goto(`${BASE}${route}`);
      await page.waitForTimeout(500);
      bucket[key] = await page.evaluate(() => ({
        pageH: document.body.scrollHeight,
        scrollW: document.documentElement.scrollWidth,
        innerW: window.innerWidth,
      }));
    }

    await page.close();

    // round every number for readable diffs
    const deep = (v) =>
      Array.isArray(v) ? v.map(deep)
        : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deep(x)]))
        : round(v);
    results.viewports[`${vp.w}x${vp.h}`] = { label: vp.label, ...deep(bucket) };
  }
} finally {
  await browser.close();
}

const overflow = Object.entries(results.viewports).flatMap(([vp, d]) =>
  Object.entries(d)
    .filter(([, v]) => v && typeof v === "object" && "scrollW" in v && v.scrollW > v.innerW)
    .map(([surface, v]) => `${vp} ${surface}: scrollW ${v.scrollW} > ${v.innerW}`),
);
results.horizontalOverflow = overflow;

if (AS_JSON || OUT) {
  const json = JSON.stringify(results, null, 2);
  if (OUT) {
    writeFileSync(OUT, json);
    console.log(`wrote ${OUT}`);
  }
  if (AS_JSON) console.log(json);
} else {
  console.log("viewport      cols gap  card         mediaH fold  detailMedia   revTop/fold  cartRow  footer");
  for (const [vp, d] of Object.entries(results.viewports)) {
    const g = d.grid ?? {};
    const dt = d.detail ?? {};
    console.log(
      `${vp.padEnd(13)} ${String(g.cols).padStart(2)}  ${String(g.gap).padEnd(4)} ` +
        `${`${g.cardW}x${g.cardH}`.padEnd(12)} ${String(g.mediaH).padStart(5)}  ` +
        `${String(g.cardsInFold).padStart(2)}   ${`${dt.mediaW}x${dt.mediaH}`.padEnd(13)} ` +
        `${String(dt.reviewsHeadingTop).padStart(4)}/${dt.reviewsAboveFold ? "Y" : "N"}      ` +
        `${String(d.cartFilled?.rowH).padStart(3)}      ${String(d.chrome?.footer?.h).padStart(3)}`,
    );
  }
  const empties = (key) =>
    Object.entries(results.viewports)
      .map(([vp, d]) => [vp, (d[key] ?? []).map((e) => `${e.h}px "${e.text.slice(0, 28)}"`).join(" | ")])
      .filter(([, s]) => s);
  for (const key of ["detailEmpties", "notFoundEmpties", "cartEmptyEmpties"]) {
    console.log(`\n${key}:`);
    for (const [vp, s] of empties(key)) console.log(`  ${vp.padEnd(13)} ${s}`);
  }
  console.log(
    `\nhorizontal overflow: ${overflow.length ? `\n  ${overflow.join("\n  ")}` : "none ✓"}`,
  );
}
