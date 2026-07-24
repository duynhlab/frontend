import apiClient from './client';
import { USE_MOCK } from './useMock';
import * as mock from './mock';

/**
 * Checkout API — RFC-0015 session funnel (all private, JWT required).
 * Edge paths: /checkout/v1/private/checkout/sessions[…] (naming v3.0.1 —
 * checkout is process-named, resources nest under the literal segment).
 */

/**
 * POST /checkout/v1/private/checkout/sessions
 */
export async function createSession() {
    if (USE_MOCK) return mock.mockCreateSession();
    const response = await apiClient.post('/checkout/v1/private/checkout/sessions');
    return response.data;
}

/**
 * GET /checkout/v1/private/checkout/sessions/:id
 */
export async function getSession(id) {
    if (USE_MOCK) return mock.mockGetSession(id);
    const response = await apiClient.get(`/checkout/v1/private/checkout/sessions/${id}`);
    return response.data;
}

/**
 * PUT /checkout/v1/private/checkout/sessions/:id/address
 */
export async function setAddress(id, address) {
    if (USE_MOCK) return mock.mockSetAddress(id, address);
    const response = await apiClient.put(`/checkout/v1/private/checkout/sessions/${id}/address`, address);
    return response.data;
}

/**
 * PUT /checkout/v1/private/checkout/sessions/:id/shipping
 */
export async function setShipping(id, shippingMethod) {
    if (USE_MOCK) return mock.mockSetShipping(id, shippingMethod);
    const response = await apiClient.put(`/checkout/v1/private/checkout/sessions/${id}/shipping`, {
        shipping_method: shippingMethod,
    });
    return response.data;
}

/**
 * PUT /checkout/v1/private/checkout/sessions/:id/payment
 */
export async function setPayment(id, paymentMethodToken) {
    if (USE_MOCK) return mock.mockSetPayment(id, paymentMethodToken);
    const response = await apiClient.put(`/checkout/v1/private/checkout/sessions/${id}/payment`, {
        payment_method_token: paymentMethodToken,
    });
    return response.data;
}

/**
 * POST /checkout/v1/private/checkout/sessions/:id/confirm
 */
export async function confirmSession(id, idempotencyKey) {
    if (USE_MOCK) return mock.mockConfirmSession(id, idempotencyKey);
    const response = await apiClient.post(
        `/checkout/v1/private/checkout/sessions/${id}/confirm`,
        null,
        { headers: { 'Idempotency-Key': idempotencyKey } }
    );
    return response.data;
}

/**
 * POST /checkout/v1/private/checkout/sessions/:id/promo
 */
export async function applyPromo(id, code) {
    if (USE_MOCK) return mock.mockApplyPromo(id, code);
    const response = await apiClient.post(`/checkout/v1/private/checkout/sessions/${id}/promo`, { code });
    return response.data;
}

/**
 * DELETE /checkout/v1/private/checkout/sessions/:id/promo
 */
export async function removePromo(id) {
    if (USE_MOCK) return mock.mockRemovePromo(id);
    const response = await apiClient.delete(`/checkout/v1/private/checkout/sessions/${id}/promo`);
    return response.data;
}

/**
 * DELETE /checkout/v1/private/checkout/sessions/:id
 */
export async function cancelSession(id) {
    if (USE_MOCK) return mock.mockCancelSession(id);
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
