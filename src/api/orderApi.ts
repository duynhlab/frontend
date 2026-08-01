import apiClient from "./client";
import * as mock from "./mock";
import type {
  CancelOrderResponse,
  Order,
  OrderDetails,
  OrderListResponse,
} from "./types/order";

/**
 * Order API — Variant A edge paths (all private, JWT required).
 * Edge paths (gateway pass-through): /order/v1/private/orders, /orders/:id,
 * /orders/:id/details, /orders/:id/cancel
 *
 * Orders are CREATED by the checkout funnel (see checkoutApi.ts). Cancellation
 * is the only write this module owns.
 */

/**
 * GET /order/v1/private/orders
 * Accepts `{ page, page_size }` params; returns the full paginated envelope
 * { items, page, page_size, total_items, total_pages } (callers read `.items`).
 */
export async function getOrders(
  params: { page?: number; page_size?: number } = {},
): Promise<OrderListResponse> {
  if (import.meta.env.VITE_USE_MOCK === "true") return mock.mockGetOrders(params);
  const response = await apiClient.get<OrderListResponse>(
    "/order/v1/private/orders",
    { params },
  );
  return response.data;
}

/**
 * GET /order/v1/private/orders/:id
 */
export async function getOrder(id: string): Promise<Order> {
  if (import.meta.env.VITE_USE_MOCK === "true") return mock.mockGetOrder(id);
  const response = await apiClient.get<Order>(`/order/v1/private/orders/${id}`);
  return response.data;
}

/**
 * GET /order/v1/private/orders/:id/details
 * Aggregation endpoint — combines order + shipment.
 */
export async function getOrderDetails(id: string): Promise<OrderDetails> {
  if (import.meta.env.VITE_USE_MOCK === "true") return mock.mockGetOrderDetails(id);
  const response = await apiClient.get<OrderDetails>(
    `/order/v1/private/orders/${id}/details`,
  );
  return response.data;
}

/**
 * POST /order/v1/private/orders/:id/cancel
 *
 * Body is empty — the cancellation reason is fixed server-side. 202 means the
 * cancellation was accepted and the saga will settle it asynchronously; 200 is
 * an idempotent replay for an order already cancelling or cancelled, so both
 * are successes. A 409 carries ORDER_NOT_CANCELLABLE or
 * SHIPMENT_ALREADY_DISPATCHED.
 */
export async function cancelOrder(id: string): Promise<CancelOrderResponse> {
  if (import.meta.env.VITE_USE_MOCK === "true") return mock.mockCancelOrder(id);
  const response = await apiClient.post<CancelOrderResponse>(
    `/order/v1/private/orders/${id}/cancel`,
  );
  return response.data;
}
