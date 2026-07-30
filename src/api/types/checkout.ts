/** Server-side checkout FSM. The status is the single source of truth for
 * which wizard step the UI shows. */
export type CheckoutSessionStatus =
  | "open"
  | "address_set"
  | "shipping_set"
  | "ready"
  | "completed";

export type ShippingMethod = "standard" | "express";

export interface CheckoutAddress {
  full_name: string;
  line1: string;
  line2?: string | undefined;
  city: string;
  region?: string | undefined;
  post_code?: string | undefined;
  /** ISO 3166-1 alpha-2. */
  country: string;
}

export interface CheckoutItem {
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  /** Set by confirm-requote when the backend re-priced this line. */
  price_changed?: boolean | undefined;
}

export interface CheckoutSession {
  id: string;
  status: CheckoutSessionStatus;
  items: CheckoutItem[];
  subtotal: number;
  /** Canonical field name per the checkout service contract (the UI has
   * always read `shipping_fee`; the in-app mock was the outlier). */
  shipping_fee: number;
  tax: number;
  discount: number;
  total: number;
  address: CheckoutAddress | null;
  shipping_method: ShippingMethod | null;
  promo_code: string | null;
  /** Present once status === "completed". */
  order_id?: string | undefined;
}

export interface ApplyPromoRequest {
  code: string;
}
