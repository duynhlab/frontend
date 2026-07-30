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

export function productNameFor(index: number): string {
  const nameIndex = index % PRODUCT_NAMES.length;
  const variant = Math.floor(index / PRODUCT_NAMES.length) + 1;
  const base = PRODUCT_NAMES[nameIndex] as string;
  return variant > 1 ? `${base} v${variant}` : base;
}

export function productPriceFor(index: number): number {
  return parseFloat((9.99 + ((index * 3.17) % 490)).toFixed(2));
}

export function productStockFor(index: number): number {
  return ((index * 7) % 200) + 1;
}
