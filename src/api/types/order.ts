import type { Paginated } from "./common";

/** Order lifecycle plus payment states surfaced by the details aggregate. */
export type OrderStatus =
  | "pending"
  | "processing"
  | "completed"
  | "shipped"
  | "delivered"
  | "in_transit"
  | "authorized"
  | "captured"
  | "failed"
  | "voided"
  | "refunded"
  | "partially_refunded";

export interface Order {
  id: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  item_count: number;
}

export type OrderListResponse = Paginated<Order>;

export interface Shipment {
  status: string;
  carrier: string;
  tracking_number: string;
}

/** Aggregation endpoint payload — order + shipment in one call. */
export interface OrderDetails {
  order: Order;
  shipment: Shipment;
}
