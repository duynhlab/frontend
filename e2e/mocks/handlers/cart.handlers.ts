
import type { AddCartItemRequest } from "@/api/types/cart";
import { apiError, json, type ApiHandler } from "../server";
import { buildCartEnvelope } from "../state";

export const cartHandlers: ApiHandler[] = [
  {
    method: "GET",
    path: /\/cart\/v1\/private\/cart\/count$/,
    fulfill: ({ route, state }) =>
      json(route, {
        count: state.cartItems.reduce((sum, i) => sum + i.quantity, 0),
      }),
  },
  {
    method: "GET",
    path: /\/cart\/v1\/private\/cart$/,
    fulfill: ({ route, state }) =>
      json(route, buildCartEnvelope(state.cartItems)),
  },
  {
    method: "POST",
    path: /\/cart\/v1\/private\/cart$/,
    fulfill: ({ route, request, state }) => {
      const body = request.postDataJSON() as AddCartItemRequest;
      // Contract check via a clean 400 (a thrown expect() here would strand
      // the request and surface as an opaque timeout instead): the UI then
      // errors and the test's success assertions fail with real context.
      if (!body.product_id || !(body.quantity > 0)) {
        return apiError(
          route,
          "malformed add-to-cart body (product_id + positive quantity required)",
          400,
          "BAD_REQUEST",
        );
      }

      const existing = state.cartItems.find(
        (i) => i.product_id === body.product_id,
      );
      if (existing) {
        existing.quantity += body.quantity;
      } else {
        state.cartItems.push({
          id: state.nextId("item"),
          product_id: body.product_id,
          product_name: body.product_name,
          product_price: body.product_price,
          quantity: body.quantity,
          subtotal: body.product_price * body.quantity,
        });
      }
      return json(route, buildCartEnvelope(state.cartItems));
    },
  },
  {
    method: "PATCH",
    path: /\/cart\/v1\/private\/cart\/items\/[^/]+$/,
    fulfill: ({ route, request, url, state }) => {
      const id = url.pathname.split("/").at(-1);
      const body = request.postDataJSON() as { quantity: number };
      const item = state.cartItems.find((i) => i.id === id);
      if (!item) return apiError(route, "Resource not found", 404);
      item.quantity = body.quantity;
      return json(route, buildCartEnvelope(state.cartItems));
    },
  },
  {
    method: "DELETE",
    path: /\/cart\/v1\/private\/cart\/items\/[^/]+$/,
    fulfill: ({ route, url, state }) => {
      const id = url.pathname.split("/").at(-1);
      state.cartItems = state.cartItems.filter((i) => i.id !== id);
      return json(route, buildCartEnvelope(state.cartItems));
    },
  },
  {
    method: "DELETE",
    path: /\/cart\/v1\/private\/cart$/,
    fulfill: ({ route, state }) => {
      state.cartItems = [];
      return json(route, buildCartEnvelope(state.cartItems));
    },
  },
];
