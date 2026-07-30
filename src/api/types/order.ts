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

/** Aggregation endpoint payload — order + shipment (+ payment) in one call. */
export interface OrderDetails {
  order: Order;
  shipment?: Shipment | undefined;
  payment?: PaymentInfo | undefined;
}
