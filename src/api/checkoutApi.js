import apiClient from './client';

/**
 * Checkout API — RFC-0015 session funnel (all private, JWT required).
 * Edge paths: /checkout/v1/private/checkout/sessions[…] (naming v3.0.1 —
 * checkout is process-named, resources nest under the literal segment).
 *
 * Error codes worth branching on (error.response.data.code):
 *   SESSION_EXPIRED (410)  — recreate the session
 *   PRICE_CHANGED / STOCK_UNAVAILABLE (409) — body carries the requoted
 *     session under `session`; re-render and let the user re-confirm with
 *     the SAME Idempotency-Key (the key is never consumed by a requote)
 *   IDEMPOTENCY_KEY_REQUIRED (400) — programming error, key missing
 */

/**
 * POST /checkout/v1/private/checkout/sessions
 * Snapshots the cart (201) or returns the existing active session (200) —
 * idempotent, one active session per user.
 */
export async function createSession() {
    const response = await apiClient.post('/checkout/v1/private/checkout/sessions');
    return response.data;
}

/**
 * GET /checkout/v1/private/checkout/sessions/:id
 */
export async function getSession(id) {
    const response = await apiClient.get(`/checkout/v1/private/checkout/sessions/${id}`);
    return response.data;
}

/**
 * PUT /checkout/v1/private/checkout/sessions/:id/address
 * → address_set. Changing the address later invalidates the shipping quote.
 */
export async function setAddress(id, address) {
    const response = await apiClient.put(`/checkout/v1/private/checkout/sessions/${id}/address`, address);
    return response.data;
}

/**
 * PUT /checkout/v1/private/checkout/sessions/:id/shipping
 * → shipping_set with the real fee (shipping GetQuote) and flat tax applied.
 */
export async function setShipping(id, shippingMethod) {
    const response = await apiClient.put(`/checkout/v1/private/checkout/sessions/${id}/shipping`, {
        shipping_method: shippingMethod,
    });
    return response.data;
}

/**
 * PUT /checkout/v1/private/checkout/sessions/:id/payment
 * → ready. Opaque tok_ references only; PAN-shaped input is rejected 400.
 */
export async function setPayment(id, paymentMethodToken) {
    const response = await apiClient.put(`/checkout/v1/private/checkout/sessions/${id}/payment`, {
        payment_method_token: paymentMethodToken,
    });
    return response.data;
}

/**
 * POST /checkout/v1/private/checkout/sessions/:id/confirm
 * The idempotent order handoff. The SAME key must be reused on every retry
 * of the same purchase attempt (double-click, flaky network, requote) —
 * that is what guarantees at most one order.
 */
export async function confirmSession(id, idempotencyKey) {
    const response = await apiClient.post(
        `/checkout/v1/private/checkout/sessions/${id}/confirm`,
        null,
        { headers: { 'Idempotency-Key': idempotencyKey } }
    );
    return response.data;
}

/**
 * POST /checkout/v1/private/checkout/sessions/:id/promo
 * Attaches a code (validated preview — a use is only counted at confirm).
 */
export async function applyPromo(id, code) {
    const response = await apiClient.post(`/checkout/v1/private/checkout/sessions/${id}/promo`, { code });
    return response.data;
}

/**
 * DELETE /checkout/v1/private/checkout/sessions/:id/promo
 */
export async function removePromo(id) {
    const response = await apiClient.delete(`/checkout/v1/private/checkout/sessions/${id}/promo`);
    return response.data;
}

/**
 * DELETE /checkout/v1/private/checkout/sessions/:id
 */
export async function cancelSession(id) {
    const response = await apiClient.delete(`/checkout/v1/private/checkout/sessions/${id}`);
    return response.data;
}

/**
 * Idempotency-Key persistence: one key per session, minted once and kept in
 * localStorage so a reload / second tab / retry converges on the same order
 * instead of minting a new attempt.
 */
export function idempotencyKeyFor(sessionId) {
    const storageKey = `checkoutIdemKey:${sessionId}`;
    let key = localStorage.getItem(storageKey);
    if (!key) {
        key = crypto.randomUUID();
        localStorage.setItem(storageKey, key);
    }
    return key;
}

/** Drop the stored key once its session reached a terminal outcome. */
export function clearIdempotencyKey(sessionId) {
    localStorage.removeItem(`checkoutIdemKey:${sessionId}`);
}
