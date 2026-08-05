import type { AuthTokensResponse, LogoutResponse } from "@/api/types/auth";
import type { Cart, CartCount, CartItem } from "@/api/types/cart";
import type {
  CheckoutAddress,
  CheckoutSession,
  ShippingMethod,
} from "@/api/types/checkout";
import type {
  AppNotification,
  MarkAllReadResponse,
  NotificationCount,
} from "@/api/types/notification";
import type {
  CancelOrderResponse,
  Order,
  OrderDetails,
  OrderListResponse,
} from "@/api/types/order";
import type {
  Product,
  ProductDetails,
  ProductListQuery,
  ProductListResponse,
  Review,
} from "@/api/types/product";
import type { PublicUser, UpdateProfileRequest, UserProfile } from "@/api/types/user";
import { canCancelOrder } from "@/lib/orderPolicy";
import { mockDelay } from "./delay";
import { mockError } from "./errors";
import { DEMO_USER, MOCK_TOKENS, TOTAL_MOCK_PRODUCTS } from "./seed";
import { availabilityFor, productIndexOf } from "./seed-constants";
import { getMockStore, nextId, resetMockStore } from "./store";

export { resetMockStore };

// ── Auth ────────────────────────────────────────────────────────────────────

export async function mockLogin(
  username: string,
  password: string,
): Promise<AuthTokensResponse> {
  await mockDelay();
  const { credentials } = getMockStore();
  if (username === credentials.username && password === credentials.password) {
    return {
      ...MOCK_TOKENS,
      user: { ...DEMO_USER },
    };
  }
  throw mockError("Invalid email or password", 401);
}

export async function mockRegister(
  username: string,
  _email: string,
  _password: string,
): Promise<AuthTokensResponse> {
  await mockDelay();
  return {
    ...MOCK_TOKENS,
    user: { id: nextId("user"), username, email: `${username}@example.com` },
  };
}

export async function mockLogout(): Promise<LogoutResponse> {
  await mockDelay(100);
  resetMockStore();
  return { ok: true };
}

// ── Products ────────────────────────────────────────────────────────────────

export async function mockGetProducts(
  params: ProductListQuery = {},
): Promise<ProductListResponse> {
  await mockDelay();
  const page = Number(params.page) || 1;
  const limit = Number(params.page_size) || 24;
  const offset = (page - 1) * limit;
  const { products } = getMockStore();
  const items = products.slice(offset, offset + limit);
  const totalPages = Math.ceil(TOTAL_MOCK_PRODUCTS / limit) || 1;

  return {
    items,
    page,
    page_size: limit,
    total_items: TOTAL_MOCK_PRODUCTS,
    total_pages: totalPages,
  };
}

export async function mockGetProduct(id: string): Promise<Product> {
  await mockDelay();
  const product = getMockStore().products.find((p) => p.id === id);
  if (!product) throw mockError("Resource not found", 404);
  return product;
}

export async function mockGetProductDetails(
  id: string,
): Promise<ProductDetails> {
  await mockDelay();
  const product = getMockStore().products.find((p) => p.id === id);
  if (!product) throw mockError("Resource not found", 404);
  const reviews = getMockStore().reviews.filter((r) => r.product_id === id);
  return {
    product,
    availability: availabilityFor(productIndexOf(id)),
    stock: { available: product.stock > 0, quantity: product.stock },
    reviews,
  };
}

// ── Cart helpers ────────────────────────────────────────────────────────────

function buildCartEnvelope(items: CartItem[]): Cart {
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

function syncCart(envelope: Cart): Cart {
  getMockStore().cartItems = envelope.items.map((i) => ({ ...i }));
  return envelope;
}

export async function mockGetCart(): Promise<Cart> {
  await mockDelay();
  return buildCartEnvelope(getMockStore().cartItems);
}

export async function mockGetCartCount(): Promise<CartCount> {
  await mockDelay(100);
  const count = getMockStore().cartItems.reduce(
    (sum, i) => sum + i.quantity,
    0,
  );
  return { count };
}

export async function mockAddToCart(
  productId: string,
  productName: string,
  productPrice: number,
  quantity = 1,
): Promise<Cart> {
  await mockDelay();
  const store = getMockStore();
  const existing = store.cartItems.find((i) => i.product_id === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    store.cartItems.push({
      id: nextId("item"),
      product_id: productId,
      product_name: productName,
      product_price: productPrice,
      quantity,
      subtotal: productPrice * quantity,
    });
  }
  return syncCart(buildCartEnvelope(store.cartItems));
}

export async function mockUpdateCartItem(
  itemId: string,
  quantity: number,
): Promise<Cart> {
  await mockDelay();
  const store = getMockStore();
  const item = store.cartItems.find((i) => i.id === itemId);
  if (!item) throw mockError("Resource not found", 404);
  item.quantity = quantity;
  return syncCart(buildCartEnvelope(store.cartItems));
}

export async function mockRemoveCartItem(itemId: string): Promise<Cart> {
  await mockDelay();
  const store = getMockStore();
  store.cartItems = store.cartItems.filter((i) => i.id !== itemId);
  return syncCart(buildCartEnvelope(store.cartItems));
}

export async function mockClearCart(): Promise<Cart> {
  await mockDelay();
  getMockStore().cartItems = [];
  return syncCart(buildCartEnvelope([]));
}

// ── User profile ────────────────────────────────────────────────────────────

export async function mockGetUserProfile(): Promise<UserProfile> {
  await mockDelay();
  return { ...getMockStore().profile };
}

export async function mockGetUser(id: string): Promise<PublicUser> {
  await mockDelay();
  if (id === DEMO_USER.id) return { ...DEMO_USER };
  throw mockError("Profile not found", 404);
}

export async function mockUpdateProfile(
  data: UpdateProfileRequest,
): Promise<UserProfile> {
  await mockDelay();
  Object.assign(getMockStore().profile, data);
  return { ...getMockStore().profile };
}

// ── Notifications ───────────────────────────────────────────────────────────

export async function mockGetNotifications(): Promise<AppNotification[]> {
  await mockDelay();
  return getMockStore().notifications.map((n) => ({ ...n }));
}

export async function mockGetNotification(
  id: string,
): Promise<AppNotification> {
  await mockDelay();
  const n = getMockStore().notifications.find((x) => x.id === id);
  if (!n) throw mockError("Resource not found", 404);
  return { ...n };
}

export async function mockMarkAsRead(id: string): Promise<AppNotification> {
  await mockDelay();
  const n = getMockStore().notifications.find((x) => x.id === id);
  if (!n) throw mockError("Cannot update notification", 404);
  n.read = true;
  return { ...n };
}

export async function mockMarkAllAsRead(): Promise<MarkAllReadResponse> {
  await mockDelay();
  const store = getMockStore();
  let updated = 0;
  store.notifications.forEach((n) => {
    if (!n.read) {
      n.read = true;
      updated += 1;
    }
  });
  return { updated };
}

export async function mockGetNotificationCount(): Promise<NotificationCount> {
  await mockDelay(100);
  const count = getMockStore().notifications.filter((n) => !n.read).length;
  return { count };
}

// ── Orders ──────────────────────────────────────────────────────────────────

export async function mockGetOrders(
  params: { page?: number; page_size?: number } = {},
): Promise<OrderListResponse> {
  await mockDelay();
  const page = Number(params.page) || 1;
  const pageSize = Number(params.page_size) || 10;
  const { orders } = getMockStore();
  const offset = (page - 1) * pageSize;
  const items = orders.slice(offset, offset + pageSize);
  const total = orders.length;
  return {
    items,
    page,
    page_size: pageSize,
    total_items: total,
    total_pages: Math.ceil(total / pageSize) || 1,
  };
}

export async function mockGetOrder(id: string): Promise<Order> {
  await mockDelay();
  const order = getMockStore().orders.find((o) => o.id === id);
  if (!order) throw mockError("Order not found", 404);
  return { ...order };
}

/**
 * Shipment status implied by the order status. `confirmed` orders have not
 * been handed to the carrier yet, which is what makes them cancellable — if
 * this returned `in_transit` for them the Cancel action would be unreachable
 * in mock mode.
 */
function mockShipmentStatus(order: Order): string {
  if (order.status === "delivered") return "delivered";
  if (order.status === "confirmed") return "pending";
  if (order.status === "cancelled") return "cancelled";
  return "in_transit";
}

export async function mockGetOrderDetails(id: string): Promise<OrderDetails> {
  await mockDelay();
  const order = getMockStore().orders.find((o) => o.id === id);
  if (!order) throw mockError("Order not found", 404);
  return {
    order: { ...order },
    shipment: {
      status: mockShipmentStatus(order),
      carrier: "Mock Express",
      tracking_number: `MOCK-${id}`,
    },
  };
}

/**
 * POST /orders/:id/cancel — mirrors the server contract: 200 for an
 * idempotent replay, 409 when the policy gate refuses, otherwise accept the
 * cancellation (202) and leave the order in `cancelling` for the saga.
 */
export async function mockCancelOrder(id: string): Promise<CancelOrderResponse> {
  await mockDelay();
  const order = getMockStore().orders.find((o) => o.id === id);
  if (!order) throw mockError("Order not found", 404);

  if (order.status === "cancelling" || order.status === "cancelled") {
    return { order_id: id, status: order.status };
  }
  if (!canCancelOrder(order, { status: mockShipmentStatus(order) })) {
    throw mockError(
      "Order can no longer be cancelled",
      409,
      "ORDER_NOT_CANCELLABLE",
    );
  }

  order.status = "cancelling";
  return { order_id: id, status: order.status };
}

// ── Reviews ─────────────────────────────────────────────────────────────────

export async function mockGetReviews(productId: string): Promise<Review[]> {
  await mockDelay();
  return getMockStore().reviews.filter((r) => r.product_id === productId);
}

export async function mockCreateReview(
  productId: string,
  userId: string,
  rating: number,
  title: string | null,
  comment: string,
): Promise<Review> {
  await mockDelay();
  const store = getMockStore();
  const duplicate = store.reviews.some(
    (r) => r.product_id === productId && String(r.user_id) === String(userId),
  );
  if (duplicate) throw mockError("Review already exists", 409);

  const review: Review = {
    id: nextId("review"),
    product_id: productId,
    user_id: userId,
    username: DEMO_USER.username,
    rating,
    title,
    comment,
    created_at: new Date().toISOString(),
  };
  store.reviews.push(review);
  return review;
}

// ── Checkout sessions ───────────────────────────────────────────────────────

const SHIPPING_FEES: Record<ShippingMethod, number> = {
  standard: 5,
  express: 12,
};

function sessionFromCart(cartEnvelope: Cart): CheckoutSession {
  return {
    id: nextId("sess"),
    status: "open",
    items: cartEnvelope.items.map((i) => ({
      product_id: i.product_id,
      product_name: i.product_name,
      unit_price: i.product_price,
      quantity: i.quantity,
      subtotal: i.subtotal,
    })),
    subtotal: cartEnvelope.subtotal,
    shipping_fee: 0,
    tax: 0,
    discount: 0,
    total: cartEnvelope.subtotal,
    address: null,
    shipping_method: null,
    promo_code: null,
  };
}

function recalcSession(session: CheckoutSession): CheckoutSession {
  session.shipping_fee = session.shipping_method
    ? (SHIPPING_FEES[session.shipping_method] ?? 5)
    : 0;
  session.tax = Math.round(session.subtotal * 0.08 * 100) / 100;
  session.total =
    session.subtotal + session.shipping_fee + session.tax - session.discount;
  return session;
}

export async function mockCreateSession(): Promise<CheckoutSession> {
  await mockDelay();
  const cart = buildCartEnvelope(getMockStore().cartItems);
  if (cart.items.length === 0) {
    throw mockError("Your cart is empty", 409, "CONFLICT");
  }
  const session = recalcSession(sessionFromCart(cart));
  getMockStore().checkoutSessions.set(session.id, session);
  return session;
}

export async function mockGetSession(id: string): Promise<CheckoutSession> {
  await mockDelay();
  const session = getMockStore().checkoutSessions.get(id);
  if (!session) throw mockError("Resource not found", 404);
  return { ...session };
}

export async function mockSetAddress(
  id: string,
  address: CheckoutAddress,
): Promise<CheckoutSession> {
  await mockDelay();
  const session = getMockStore().checkoutSessions.get(id);
  if (!session) throw mockError("Resource not found", 404);
  session.address = { ...address };
  session.status = "address_set";
  return { ...recalcSession(session) };
}

export async function mockSetShipping(
  id: string,
  shippingMethod: ShippingMethod,
): Promise<CheckoutSession> {
  await mockDelay();
  const session = getMockStore().checkoutSessions.get(id);
  if (!session) throw mockError("Resource not found", 404);
  session.shipping_method = shippingMethod;
  session.status = "shipping_set";
  return { ...recalcSession(session) };
}

export async function mockSetPayment(
  id: string,
  _paymentMethodToken: string,
): Promise<CheckoutSession> {
  await mockDelay();
  const session = getMockStore().checkoutSessions.get(id);
  if (!session) throw mockError("Resource not found", 404);
  session.status = "ready";
  return { ...recalcSession(session) };
}

export async function mockApplyPromo(
  id: string,
  code: string,
): Promise<CheckoutSession> {
  await mockDelay();
  const session = getMockStore().checkoutSessions.get(id);
  if (!session) throw mockError("Resource not found", 404);
  if (code.toLowerCase() !== "save10") {
    throw mockError("Promo code not found", 400, "PROMO_INVALID");
  }
  session.promo_code = code;
  session.discount = Math.round(session.subtotal * 0.1 * 100) / 100;
  return { ...recalcSession(session) };
}

export async function mockRemovePromo(id: string): Promise<CheckoutSession> {
  await mockDelay();
  const session = getMockStore().checkoutSessions.get(id);
  if (!session) throw mockError("Resource not found", 404);
  session.promo_code = null;
  session.discount = 0;
  return { ...recalcSession(session) };
}

export async function mockConfirmSession(
  id: string,
): Promise<CheckoutSession> {
  await mockDelay(400);
  const store = getMockStore();
  const session = store.checkoutSessions.get(id);
  if (!session) throw mockError("Resource not found", 404);
  if (session.status !== "ready") {
    throw mockError(
      "This step is not available for the current checkout state",
      400,
      "INVALID_TRANSITION",
    );
  }

  const orderId = nextId("ord");
  store.orders.unshift({
    id: orderId,
    status: "processing",
    total: session.total,
    created_at: new Date().toISOString(),
    item_count: session.items.reduce((s, i) => s + i.quantity, 0),
  });
  store.cartItems = [];
  store.notifications.unshift({
    id: nextId("notif"),
    type: "order",
    title: "Order placed",
    message: `Order #${orderId} was placed successfully.`,
    read: false,
    created_at: new Date().toISOString(),
  });

  session.status = "completed";
  session.order_id = orderId;
  return { ...session };
}

export async function mockCancelSession(
  id: string,
): Promise<{ ok: boolean }> {
  await mockDelay();
  getMockStore().checkoutSessions.delete(id);
  return { ok: true };
}
