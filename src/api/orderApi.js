import apiClient from './client';

/**
 * Order API — Variant A edge paths (all private, JWT required).
 * Cluster mounts (reference): /api/v1/orders, /api/v1/orders/:id, /api/v1/orders/:id/details
 */

/**
 * GET /order/v1/private/orders  →  /api/v1/orders
 * Accepts `{ page, page_size }` params; returns the full paginated envelope
 * { items, page, page_size, total_items, total_pages } (callers read `.items`).
 */
export async function getOrders(params = {}) {
    const response = await apiClient.get('/order/v1/private/orders', { params });
    return response.data;
}

/**
 * GET /order/v1/private/orders/:id  →  /api/v1/orders/:id
 */
export async function getOrder(id) {
    const response = await apiClient.get(`/order/v1/private/orders/${id}`);
    return response.data;
}

/**
 * GET /order/v1/private/orders/:id/details  →  /api/v1/orders/:id/details
 * Aggregation endpoint — combines order + shipment.
 */
export async function getOrderDetails(id) {
    const response = await apiClient.get(`/order/v1/private/orders/${id}/details`);
    return response.data;
}

/**
 * POST /order/v1/private/orders  →  /api/v1/orders
 */
export async function createOrder(orderData) {
    const response = await apiClient.post('/order/v1/private/orders', orderData);
    return response.data;
}
