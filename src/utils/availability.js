// Availability presentation for the product detail page (RFC-0021).
//
// The stock number product-service used to return came from its own
// `products.stock_quantity`, a column frozen at the phase-3 write cutover — so the
// page was showing a count that could never change. Inventory-service is the
// authority now, and it answers with a STATUS plus an optional available-to-promise
// figure rather than a raw column.
//
// Two rules this encodes:
//
//   - `unknown` must never render as in-stock or out-of-stock. Inventory soft-fails
//     to unknown when it cannot be reached, and a page that guesses either way
//     turns a degraded read into a claim about the customer's order.
//   - a quantity is shown only when the authority sent one. `available_to_promise`
//     is omitted (not zeroed) on an unknown answer precisely so that a missing
//     figure cannot be confused with a real zero.

const STATUS = {
    in_stock: { className: 'stock-available', label: 'In Stock' },
    low_stock: { className: 'stock-low', label: 'Low Stock' },
    out_of_stock: { className: 'stock-out', label: 'Out of Stock' },
    unknown: { className: 'stock-unknown', label: 'Availability unknown' },
};

/**
 * Describe availability for rendering.
 *
 * @param {{status?: string, available_to_promise?: number}} [availability]
 *   inventory-sourced block from GET /products/:id/details.
 * @param {{available?: boolean, quantity?: number}} [legacyStock]
 *   product's own frozen `stock` block. Read ONLY when `availability` is absent,
 *   which happens against a product build older than the enrichment — it keeps the
 *   page working regardless of the order the two services deploy in. It goes away
 *   with the `stock` block itself.
 * @returns {{className: string, text: string, purchasable: boolean}|null} null when
 *   neither source answered, so the caller renders nothing rather than an empty line.
 *
 *   `purchasable` is false ONLY when we positively know the item is out of stock.
 *   An `unknown` answer leaves it TRUE on purpose: adding to a cart is not a
 *   reservation, and refusing the action because a read degraded turns a lost read
 *   into a lost sale. Checkout is where availability is enforced, and it fails
 *   closed there — a 503 the shopper can retry, not a silently dead button.
 */
export function describeAvailability(availability, legacyStock) {
    if (availability?.status) {
        const shape = STATUS[availability.status] ?? STATUS.unknown;
        const qty = availability.available_to_promise;
        const showQty = shape !== STATUS.unknown && typeof qty === 'number' && qty > 0;
        return {
            className: shape.className,
            text: showQty ? `${shape.label} (${qty})` : shape.label,
            purchasable: availability.status !== 'out_of_stock',
        };
    }

    if (legacyStock) {
        return legacyStock.available
            ? {
                className: STATUS.in_stock.className,
                text: typeof legacyStock.quantity === 'number'
                    ? `In Stock (${legacyStock.quantity})`
                    : STATUS.in_stock.label,
                purchasable: true,
            }
            : { className: STATUS.out_of_stock.className, text: STATUS.out_of_stock.label, purchasable: false };
    }

    return null;
}
