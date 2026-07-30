import type { Cart, CartItem } from "@/api/types/cart";
import type {
  CheckoutAddress,
  CheckoutSession,
  ShippingMethod,
} from "@/api/types/checkout";
import type { AppNotification } from "@/api/types/notification";
import type { Order } from "@/api/types/order";
import type { Product } from "@/api/types/product";
import type { Review } from "@/api/types/product";
import type { UserProfile } from "@/api/types/user";
import { generateProducts } from "./responses/products.responses";
import { seedProfile } from "./responses/auth.responses";
import {
  seedNotifications,
  seedOrders,
} from "./responses/account.responses";

/**
 * Per-test mutable server state for the route-mock layer. A deliberately
 * independent (thinner) implementation from src/api/mock — the two layers
 * share only DTO types and pure seed constants (AGENTS.md).
 */
export interface MockState {
  products: Product[];
  cartItems: CartItem[];
  notifications: AppNotification[];
  orders: Order[];
  profile: UserProfile;
  reviews: Review[];
  checkoutSessions: Map<string, CheckoutSession>;
  /** Bumped on every refresh grant — tests assert single-flight with it. */
  refreshCount: number;
  tokenGeneration: number;
  nextId: (prefix: string) => string;
}

export function createMockState(): MockState {
  let seq = 5000;
  return {
    products: generateProducts(),
    cartItems: [],
    notifications: seedNotifications.map((n) => ({ ...n })),
    orders: seedOrders.map((o) => ({ ...o })),
    profile: { ...seedProfile },
    reviews: [],
    checkoutSessions: new Map(),
    refreshCount: 0,
    tokenGeneration: 0,
    nextId: (prefix: string) => `${prefix}-${(seq += 1)}`,
  };
}

export function buildCartEnvelope(items: CartItem[]): Cart {
  const normalized = items.map((item) => ({
    ...item,
    subtotal: item.product_price * item.quantity,
  }));
  const subtotal = normalized.reduce((sum, i) => sum + i.subtotal, 0);
  const shipping = normalized.length > 0 ? 5 : 0;
  return {
    items: normalized,
    item_count: normalized.reduce((sum, i) => sum + i.quantity, 0),
    subtotal,
    shipping,
    total: subtotal + shipping,
  };
}

const SHIPPING_FEES: Record<ShippingMethod, number> = {
  standard: 5,
  express: 12,
};

export function recalcSession(session: CheckoutSession): CheckoutSession {
  session.shipping_fee = session.shipping_method
    ? SHIPPING_FEES[session.shipping_method]
    : 0;
  session.tax = Math.round(session.subtotal * 0.08 * 100) / 100;
  session.total =
    session.subtotal + session.shipping_fee + session.tax - session.discount;
  return session;
}

export function sessionFromCart(state: MockState): CheckoutSession {
  const cart = buildCartEnvelope(state.cartItems);
  return recalcSession({
    id: state.nextId("sess"),
    status: "open",
    items: cart.items.map((i) => ({
      product_id: i.product_id,
      product_name: i.product_name,
      unit_price: i.product_price,
      quantity: i.quantity,
      subtotal: i.subtotal,
    })),
    subtotal: cart.subtotal,
    shipping_fee: 0,
    tax: 0,
    discount: 0,
    total: cart.subtotal,
    address: null,
    shipping_method: null,
    promo_code: null,
  });
}

export function setSessionAddress(
  session: CheckoutSession,
  address: CheckoutAddress,
): CheckoutSession {
  session.address = { ...address };
  session.status = "address_set";
  return recalcSession(session);
}
