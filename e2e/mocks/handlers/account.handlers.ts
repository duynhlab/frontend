import type { Review } from "@/api/types/product";
import type { UpdateProfileRequest } from "@/api/types/user";
import { apiError, json, type ApiHandler } from "../server";
import { e2eCanCancel, orderDetailsFor } from "../responses/account.responses";
import { E2E_USER } from "../responses/auth.responses";

export const orderHandlers: ApiHandler[] = [
  {
    // POST /orders/:id/cancel — mirrors the server contract: 200 for an
    // idempotent replay, 409 when the policy gate refuses, 202 otherwise.
    // Cancellation settles asynchronously, so the order is parked in
    // `cancelling` rather than jumping straight to `cancelled`.
    method: "POST",
    path: /\/order\/v1\/private\/orders\/[^/]+\/cancel$/,
    fulfill: ({ route, url, state }) => {
      const id = url.pathname.split("/").at(-2);
      const order = state.orders.find((o) => o.id === id);
      if (!order) return apiError(route, "Order not found", 404);

      if (order.status === "cancelling" || order.status === "cancelled") {
        return json(route, { order_id: order.id, status: order.status }, 200);
      }
      if (!e2eCanCancel(order)) {
        return apiError(
          route,
          "Order can no longer be cancelled",
          409,
          "ORDER_NOT_CANCELLABLE",
        );
      }

      order.status = "cancelling";
      return json(route, { order_id: order.id, status: order.status }, 202);
    },
  },
  {
    method: "GET",
    path: /\/order\/v1\/private\/orders\/[^/]+\/details$/,
    fulfill: ({ route, url, state }) => {
      const id = url.pathname.split("/").at(-2);
      const order = state.orders.find((o) => o.id === id);
      if (!order) return apiError(route, "Order not found", 404);
      return json(route, orderDetailsFor(order));
    },
  },
  {
    method: "GET",
    path: /\/order\/v1\/private\/orders\/[^/]+$/,
    fulfill: ({ route, url, state }) => {
      const id = url.pathname.split("/").at(-1);
      const order = state.orders.find((o) => o.id === id);
      if (!order) return apiError(route, "Order not found", 404);
      return json(route, { ...order });
    },
  },
  {
    method: "GET",
    path: /\/order\/v1\/private\/orders$/,
    fulfill: ({ route, url, state }) => {
      const page = Number(url.searchParams.get("page")) || 1;
      const pageSize = Number(url.searchParams.get("page_size")) || 10;
      const offset = (page - 1) * pageSize;
      return json(route, {
        items: state.orders.slice(offset, offset + pageSize),
        page,
        page_size: pageSize,
        total_items: state.orders.length,
        total_pages: Math.ceil(state.orders.length / pageSize) || 1,
      });
    },
  },
];

export const notificationHandlers: ApiHandler[] = [
  {
    method: "GET",
    path: /\/notification\/v1\/private\/notifications\/count$/,
    fulfill: ({ route, state }) =>
      json(route, {
        count: state.notifications.filter((n) => !n.read).length,
      }),
  },
  {
    method: "PATCH",
    path: /\/notification\/v1\/private\/notifications\/read-all$/,
    fulfill: ({ route, state }) => {
      let updated = 0;
      state.notifications.forEach((n) => {
        if (!n.read) {
          n.read = true;
          updated += 1;
        }
      });
      return json(route, { updated });
    },
  },
  {
    method: "PATCH",
    path: /\/notification\/v1\/private\/notifications\/[^/]+$/,
    fulfill: ({ route, url, state }) => {
      const id = url.pathname.split("/").at(-1);
      const notification = state.notifications.find((n) => n.id === id);
      if (!notification) {
        return apiError(route, "Cannot update notification", 404);
      }
      notification.read = true;
      return json(route, { ...notification });
    },
  },
  {
    method: "GET",
    path: /\/notification\/v1\/private\/notifications$/,
    fulfill: ({ route, state }) =>
      json(route, {
        items: state.notifications.map((n) => ({ ...n })),
        page: 1,
        page_size: state.notifications.length,
        total_items: state.notifications.length,
        total_pages: 1,
      }),
  },
];

export const userHandlers: ApiHandler[] = [
  {
    method: "GET",
    path: /\/user\/v1\/private\/users\/profile$/,
    fulfill: ({ route, state }) => json(route, { ...state.profile }),
  },
  {
    method: "PUT",
    path: /\/user\/v1\/private\/users\/profile$/,
    fulfill: ({ route, request, state }) => {
      const body = request.postDataJSON() as UpdateProfileRequest;
      Object.assign(state.profile, body);
      return json(route, { ...state.profile });
    },
  },
  {
    method: "GET",
    path: /\/user\/v1\/public\/users\/[^/]+$/,
    fulfill: ({ route }) => json(route, { ...E2E_USER }),
  },
];

export const reviewHandlers: ApiHandler[] = [
  {
    method: "GET",
    path: /\/review\/v1\/public\/reviews$/,
    fulfill: ({ route, url, state }) => {
      const productId = url.searchParams.get("product_id");
      const items = state.reviews.filter((r) => r.product_id === productId);
      return json(route, {
        items,
        page: 1,
        page_size: items.length,
        total_items: items.length,
        total_pages: 1,
      });
    },
  },
  {
    method: "POST",
    path: /\/review\/v1\/private\/reviews$/,
    fulfill: ({ route, request, state }) => {
      const body = request.postDataJSON() as {
        product_id: string;
        user_id: string;
        rating: number;
        title: string | null;
        comment: string;
      };
      const duplicate = state.reviews.some(
        (r) =>
          r.product_id === body.product_id &&
          String(r.user_id) === String(body.user_id),
      );
      if (duplicate) return apiError(route, "Review already exists", 409);
      const review: Review = {
        id: state.nextId("review"),
        product_id: body.product_id,
        user_id: body.user_id,
        username: E2E_USER.username,
        rating: body.rating,
        title: body.title,
        comment: body.comment,
        created_at: "2026-07-30T00:00:00Z",
      };
      state.reviews.push(review);
      return json(route, review);
    },
  },
];
