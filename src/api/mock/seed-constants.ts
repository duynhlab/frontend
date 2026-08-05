/**
 * Deterministic seed constants shared between the in-app mock
 * (`src/api/mock/seed.ts`) and the Playwright route-mock fixtures
 * (`e2e/mocks/responses/`). Sharing ONLY pure constants/derivations keeps the
 * two mock layers from drifting on counts, pagination, and pricing without
 * coupling their runtime handlers (see AGENTS.md testing policy).
 */

export const PRODUCT_NAMES = [
  "Wireless Headphones", "Smart Watch", "Laptop Stand", "USB-C Hub",
  "Mechanical Keyboard", "Gaming Mouse", "Monitor Light Bar", "Webcam HD",
  "Desk Mat", "Cable Organizer", "Phone Stand", "Portable SSD",
  "Bluetooth Speaker", "Power Bank", "Screen Protector", "Laptop Sleeve",
  "Wireless Charger", "Noise Canceller", "Smart Plug", "LED Strip",
  "Tablet Case", "Stylus Pen", "USB Microphone", "Ring Light",
  "Ergonomic Chair", "Standing Desk", "Air Purifier", "Smart Thermostat",
  "Fitness Tracker", "VR Headset",
] as const;

export const TOTAL_SEED_PRODUCTS = 48;
export const DEFAULT_PAGE_SIZE = 24;

export function productIdFor(index: number): string {
  return `prod-${String(index + 1).padStart(5, "0")}`;
}

/** Inverse of productIdFor; -1 for an id outside the seeded catalog. */
export function productIndexOf(id: string): number {
  const parsed = Number.parseInt(id.replace(/^prod-/, ""), 10);
  return Number.isNaN(parsed) ? -1 : parsed - 1;
}

export function productNameFor(index: number): string {
  const nameIndex = index % PRODUCT_NAMES.length;
  const variant = Math.floor(index / PRODUCT_NAMES.length) + 1;
  const base = PRODUCT_NAMES[nameIndex] as string;
  return variant > 1 ? `${base} v${variant}` : base;
}

export function productPriceFor(index: number): number {
  return parseFloat((9.99 + ((index * 3.17) % 490)).toFixed(2));
}

/**
 * Reserved catalog slots, so every availability state is reachable in both mock
 * layers. Before this, `productStockFor` returned 1..200 and never 0 — which
 * meant `available` was always true and the out-of-stock UI was dead code no
 * test could reach.
 *
 * The last three indices are used deliberately: `prod-00001` is the
 * add-to-cart product in roughly a dozen specs across every suite and must stay
 * purchasable.
 */
export const OUT_OF_STOCK_INDEX = TOTAL_SEED_PRODUCTS - 3; // prod-00046
export const LOW_STOCK_INDEX = TOTAL_SEED_PRODUCTS - 2; // prod-00047
export const UNKNOWN_AVAILABILITY_INDEX = TOTAL_SEED_PRODUCTS - 1; // prod-00048

/** Threshold below which inventory reports `low_stock` rather than `in_stock`. */
export const LOW_STOCK_THRESHOLD = 5;

/**
 * The `+ 10` floor matters: `(index * 7) % 200` is 0 only at index 0, so the
 * previous `+ 1` gave `prod-00001` a stock of exactly 1. That is below
 * LOW_STOCK_THRESHOLD, which would label the app's primary demo product
 * "Low Stock (1)" and clamp the quantity selector's max to 1 — disabling the
 * increase button that a dozen specs click. Only the reserved slots below
 * should be anything other than comfortably in stock.
 */
export function productStockFor(index: number): number {
  if (index === OUT_OF_STOCK_INDEX) return 0;
  if (index === LOW_STOCK_INDEX) return 3;
  return ((index * 7) % 200) + 10;
}

/**
 * The inventory-sourced availability block for a seeded product.
 *
 * `unknown` omits `available_to_promise` rather than zeroing it — that
 * asymmetry is the contract, and a fixture that sent 0 here would let a bug
 * that confuses "no answer" with "none left" pass.
 */
export function availabilityFor(index: number): {
  status: "in_stock" | "low_stock" | "out_of_stock" | "unknown";
  available_to_promise?: number;
} {
  if (index === UNKNOWN_AVAILABILITY_INDEX) return { status: "unknown" };

  const quantity = productStockFor(index);
  if (quantity === 0) return { status: "out_of_stock" };
  if (quantity <= LOW_STOCK_THRESHOLD) {
    return { status: "low_stock", available_to_promise: quantity };
  }
  return { status: "in_stock", available_to_promise: quantity };
}
