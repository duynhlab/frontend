import type { Availability, AvailabilityStatus, Stock } from "@/api/types/product";

/** Semantic tone, not a class name — callers own the Tailwind mapping. */
export type AvailabilityTone = "success" | "warning" | "destructive" | "muted";

interface AvailabilityDisplay {
  label: string;
  tone: AvailabilityTone;
}

const STATUS: Record<AvailabilityStatus, AvailabilityDisplay> = {
  in_stock: { label: "In Stock", tone: "success" },
  low_stock: { label: "Low Stock", tone: "warning" },
  out_of_stock: { label: "Out of Stock", tone: "destructive" },
  // Muted on purpose: the page must not imply a definite in-stock or
  // out-of-stock when it does not know one.
  unknown: { label: "Availability unknown", tone: "muted" },
};

/**
 * Availability presentation for the product detail page (RFC-0021).
 *
 * The stock number product-service used to return came from its own
 * `products.stock_quantity`, a column frozen at the phase-3 write cutover — so
 * the page was showing a count that could never change. Inventory-service is
 * the authority now.
 *
 * Two rules this encodes:
 *
 *   - `unknown` must never render as in-stock or out-of-stock. Inventory
 *     soft-fails to unknown when it cannot be reached, and a page that guesses
 *     either way turns a degraded read into a claim about the customer's order.
 *   - A quantity is shown only when the authority sent one. `available_to_promise`
 *     is omitted (not zeroed) on an unknown answer precisely so that a missing
 *     figure cannot be confused with a real zero.
 *
 * @param legacyStock read ONLY when `availability` is absent, which happens
 *   against a product build older than the enrichment. It goes away with the
 *   `stock` block itself.
 * @returns null when neither source answered, so the caller renders nothing
 *   rather than an empty line.
 */
export function describeAvailability(
  availability?: Availability | undefined,
  legacyStock?: Stock | undefined,
): AvailabilityDisplay | null {
  if (availability?.status) {
    const shape = STATUS[availability.status] ?? STATUS.unknown;
    const qty = availability.available_to_promise;
    const showQty =
      shape !== STATUS.unknown && typeof qty === "number" && qty > 0;
    return {
      label: showQty ? `${shape.label} (${qty})` : shape.label,
      tone: shape.tone,
    };
  }

  if (legacyStock) {
    if (!legacyStock.available) return STATUS.out_of_stock;
    return {
      label:
        typeof legacyStock.quantity === "number"
          ? `In Stock (${legacyStock.quantity})`
          : STATUS.in_stock.label,
      tone: STATUS.in_stock.tone,
    };
  }

  return null;
}

/**
 * Whether the customer may attempt to buy.
 *
 * Blocks only a **definite** out-of-stock. `unknown` stays purchasable on
 * purpose: refusing on a degraded read is the same guess `describeAvailability`
 * refuses to make, and the server re-checks at add-to-cart and again at
 * checkout confirm. When neither source answered it also stays purchasable —
 * otherwise the day product-service drops the `stock` block, every Add to Cart
 * button in the app would go permanently dead.
 */
export function isPurchasable(
  availability?: Availability | undefined,
  legacyStock?: Stock | undefined,
): boolean {
  if (availability?.status) return availability.status !== "out_of_stock";
  if (legacyStock) return legacyStock.available;
  return true;
}

/**
 * Upper clamp for the quantity selector, or undefined for unbounded.
 *
 * Only ever a figure the authority actually sent. Note that an unbounded
 * selector is the correct outcome for an unknown answer — the alternative,
 * clamping to zero, would assert a stock level nobody reported.
 */
export function purchasableQuantity(
  availability?: Availability | undefined,
  legacyStock?: Stock | undefined,
): number | undefined {
  if (availability?.status) {
    const qty = availability.available_to_promise;
    return typeof qty === "number" && qty > 0 ? qty : undefined;
  }
  if (legacyStock?.available) return legacyStock.quantity;
  return undefined;
}
