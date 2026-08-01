import apiClient from './client';
import { USE_MOCK } from './useMock';
import * as mock from './mock';

/**
 * Order API — Variant A edge paths (all private, JWT required).
 * Edge paths (gateway pass-through): /order/v1/private/orders, /orders/:id,
 * /orders/:id/details, /orders/:id/cancel
 */

/**
 * GET /order/v1/private/orders
 * Accepts `{ page, page_size }` params; returns the full paginated envelope
 * { items, page, page_size, total_items, total_pages } (callers read `.items`).
 */
export async function getOrders(params = {}) {
    if (USE_MOCK) return mock.mockGetOrders(params);
    const response = await apiClient.get('/order/v1/private/orders', { params });
    return response.data;
}

/**
 * GET /order/v1/private/orders/:id
 */
export async function getOrder(id) {
    if (USE_MOCK) return mock.mockGetOrder(id);
    const response = await apiClient.get(`/order/v1/private/orders/${id}`);
    return response.data;
}

/**
 * GET /order/v1/private/orders/:id/details
 * Aggregation endpoint — combines order + shipment.
 */
export async function getOrderDetails(id) {
    if (USE_MOCK) return mock.mockGetOrderDetails(id);
    const response = await apiClient.get(`/order/v1/private/orders/${id}/details`);
    return response.data;
}

/**
 * POST /order/v1/private/orders/:id/cancel
 * Body is empty (reason is fixed server-side). 202 = cancellation accepted,
 * 200 = idempotent replay (already cancelling/cancelled), 409 = not cancellable.
 */
export async function cancelOrder(id) {
    if (USE_MOCK) return mock.mockCancelOrder(id);
    const response = await apiClient.post(`/order/v1/private/orders/${id}/cancel`);
    return response.data;
}
