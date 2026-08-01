import type { Paginated } from "./common";

/**
 * Order lifecycle plus payment states surfaced by the details aggregate.
 *
 * `confirmed` / `cancelling` / `cancelled` / `manual_review` are the RFC-0021
 * order FSM states. `cancelling` is deliberately distinct from `cancelled`:
 * cancellation is accepted asynchronously (202), so the order sits in
 * `cancelling` until the saga settles.
 */
export type OrderStatus =
  | "pending"
  | "processing"
  | "confirmed"
  | "completed"
  | "shipped"
  | "delivered"
  | "in_transit"
  | "cancelling"
  | "cancelled"
  | "manual_review"
  | "authorized"
  | "captured"
  | "failed"
  | "voided"
  | "refunded"
  | "partially_refunded";

export interface OrderItem {
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Order {
  id: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  item_count: number;
  /** Present on the details aggregate, absent in the list. */
  items?: OrderItem[] | undefined;
  subtotal?: number | undefined;
  shipping?: number | undefined;
}

export type OrderListResponse = Paginated<Order>;

export interface Shipment {
  status: string;
  carrier?: string | null | undefined;
  tracking_number: string;
  estimated_delivery?: string | undefined;
}

/** Present when payments are enabled (order-details enrichment). */
export interface PaymentInfo {
  status: string;
  amount: number;
  refunded?: number | undefined;
  decline_code?: string | null | undefined;
}

/** Where the order sits in the fulfilment saga (absent on pre-RFC-0021 orders). */
export interface OrderProcessing {
  stage: string;
  last_error_code?: string | undefined;
}

/** Aggregation endpoint payload — order + shipment (+ payment) in one call. */
export interface OrderDetails {
  order: Order;
  shipment?: Shipment | undefined;
  payment?: PaymentInfo | undefined;
  processing?: OrderProcessing | undefined;
  /**
   * Enrichment blocks the aggregate failed to fetch, by name. Distinct from a
   * block being absent: absent means "no such data", degraded means "we could
   * not read it", and the UI must not present the two the same way.
   */
  degraded?: string[] | undefined;
}

/** POST /orders/:id/cancel — 202 accepted, 200 idempotent replay. */
export interface CancelOrderResponse {
  order_id: string;
  status: OrderStatus;
}
