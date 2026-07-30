import type { CheckoutAddress, ShippingMethod } from "@/api/types/checkout";
import { apiError, json, type ApiHandler } from "../server";
import {
  recalcSession,
  sessionFromCart,
  setSessionAddress,
} from "../state";

const SESSION_PATH = /\/checkout\/v1\/private\/checkout\/sessions\/([^/]+)/;

function sessionId(pathname: string): string {
  return SESSION_PATH.exec(pathname)?.[1] ?? "";
}

export const checkoutHandlers: ApiHandler[] = [
  {
    method: "POST",
    path: /\/checkout\/v1\/private\/checkout\/sessions$/,
    fulfill: ({ route, state }) => {
      if (state.cartItems.length === 0) {
        return apiError(route, "Your cart is empty", 409, "CONFLICT");
      }
      const session = sessionFromCart(state);
      state.checkoutSessions.set(session.id, session);
      return json(route, session);
    },
  },
  {
    method: "PUT",
    path: /\/checkout\/v1\/private\/checkout\/sessions\/[^/]+\/address$/,
    fulfill: ({ route, request, url, state }) => {
      const session = state.checkoutSessions.get(sessionId(url.pathname));
      if (!session) return apiError(route, "Resource not found", 404);
      const address = request.postDataJSON() as CheckoutAddress;
      return json(route, { ...setSessionAddress(session, address) });
    },
  },
  {
    method: "PUT",
    path: /\/checkout\/v1\/private\/checkout\/sessions\/[^/]+\/shipping$/,
    fulfill: ({ route, request, url, state }) => {
      const session = state.checkoutSessions.get(sessionId(url.pathname));
      if (!session) return apiError(route, "Resource not found", 404);
      const body = request.postDataJSON() as { shipping_method: ShippingMethod };
      session.shipping_method = body.shipping_method;
      session.status = "shipping_set";
      return json(route, { ...recalcSession(session) });
    },
  },
  {
    method: "PUT",
    path: /\/checkout\/v1\/private\/checkout\/sessions\/[^/]+\/payment$/,
    fulfill: ({ route, request, url, state }) => {
      const session = state.checkoutSessions.get(sessionId(url.pathname));
      if (!session) return apiError(route, "Resource not found", 404);
      const body = request.postDataJSON() as { payment_method_token: string };
      if (!/^tok_/.test(body.payment_method_token)) {
        return apiError(
          route,
          "payment_method_token must be an opaque tok_ reference",
          400,
        );
      }
      session.status = "ready";
      return json(route, { ...recalcSession(session) });
    },
  },
  {
    method: "POST",
    path: /\/checkout\/v1\/private\/checkout\/sessions\/[^/]+\/promo$/,
    fulfill: ({ route, request, url, state }) => {
      const session = state.checkoutSessions.get(sessionId(url.pathname));
      if (!session) return apiError(route, "Resource not found", 404);
      const body = request.postDataJSON() as { code: string };
      if (body.code.toLowerCase() !== "save10") {
        return apiError(route, "Promo code not found", 400, "PROMO_INVALID");
      }
      session.promo_code = body.code;
      session.discount = Math.round(session.subtotal * 0.1 * 100) / 100;
      return json(route, { ...recalcSession(session) });
    },
  },
  {
    method: "DELETE",
    path: /\/checkout\/v1\/private\/checkout\/sessions\/[^/]+\/promo$/,
    fulfill: ({ route, url, state }) => {
      const session = state.checkoutSessions.get(sessionId(url.pathname));
      if (!session) return apiError(route, "Resource not found", 404);
      session.promo_code = null;
      session.discount = 0;
      return json(route, { ...recalcSession(session) });
    },
  },
  {
    method: "POST",
    path: /\/checkout\/v1\/private\/checkout\/sessions\/[^/]+\/confirm$/,
    fulfill: ({ route, request, url, state }) => {
      const session = state.checkoutSessions.get(sessionId(url.pathname));
      if (!session) return apiError(route, "Resource not found", 404);
      if (!request.headers()["idempotency-key"]) {
        return apiError(
          route,
          "Idempotency-Key header is required",
          400,
          "IDEMPOTENCY_KEY_REQUIRED",
        );
      }
      if (session.status !== "ready") {
        return apiError(
          route,
          "This step is not available for the current checkout state",
          400,
          "INVALID_TRANSITION",
        );
      }
      const orderId = state.nextId("ord");
      state.orders.unshift({
        id: orderId,
        status: "processing",
        total: session.total,
        created_at: "2026-07-30T00:00:00Z",
        item_count: session.items.reduce((s, i) => s + i.quantity, 0),
      });
      state.cartItems = [];
      state.notifications.unshift({
        id: state.nextId("notif"),
        type: "order_placed",
        title: "Order placed",
        message: `Order #${orderId} was placed successfully.`,
        read: false,
        created_at: "2026-07-30T00:00:00Z",
      });
      session.status = "completed";
      session.order_id = orderId;
      return json(route, { ...session });
    },
  },
  {
    method: "GET",
    path: /\/checkout\/v1\/private\/checkout\/sessions\/[^/]+$/,
    fulfill: ({ route, url, state }) => {
      const session = state.checkoutSessions.get(sessionId(url.pathname));
      if (!session) return apiError(route, "Resource not found", 404);
      return json(route, { ...session });
    },
  },
  {
    method: "DELETE",
    path: /\/checkout\/v1\/private\/checkout\/sessions\/[^/]+$/,
    fulfill: ({ route, url, state }) => {
      state.checkoutSessions.delete(sessionId(url.pathname));
      return json(route, { ok: true });
    },
  },
];
