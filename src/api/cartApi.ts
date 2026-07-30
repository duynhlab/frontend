import type { AxiosRequestConfig } from "axios";
import apiClient from "./client";
import * as mock from "./mock";
import type { Cart, CartCount } from "./types/cart";

/**
 * Cart API — Variant A edge paths (all private, JWT required).
 * Edge paths (gateway pass-through): /cart/v1/private/cart, /cart/count, /cart/items/:itemId
 */

/**
 * GET /cart/v1/private/cart
 */
export async function getCart(): Promise<Cart> {
  if (import.meta.env.VITE_USE_MOCK === "true") return mock.mockGetCart();
  const response = await apiClient.get<Cart>("/cart/v1/private/cart");
  return response.data;
}

/**
 * GET /cart/v1/private/cart/count
 * Called by the cart badge on a short poll; passes `skipAuthRefresh` so that
 * a 401 here does not yank the user to /login.
 */
export async function getCartCount(
  config: AxiosRequestConfig = {},
): Promise<CartCount> {
  if (import.meta.env.VITE_USE_MOCK === "true") return mock.mockGetCartCount();
  const response = await apiClient.get<CartCount>(
    "/cart/v1/private/cart/count",
    config,
  );
  return response.data;
}

/**
 * POST /cart/v1/private/cart
 */
export async function addToCart(
  productId: string,
  productName: string,
  productPrice: number,
  quantity = 1,
): Promise<Cart> {
  if (import.meta.env.VITE_USE_MOCK === "true") {
    return mock.mockAddToCart(productId, productName, productPrice, quantity);
  }
  const response = await apiClient.post<Cart>("/cart/v1/private/cart", {
    product_id: productId,
    product_name: productName,
    product_price: productPrice,
    quantity,
  });
  return response.data;
}

/**
 * PATCH /cart/v1/private/cart/items/:itemId
 */
export async function updateCartItem(
  itemId: string,
  quantity: number,
): Promise<Cart> {
  if (import.meta.env.VITE_USE_MOCK === "true") return mock.mockUpdateCartItem(itemId, quantity);
  const response = await apiClient.patch<Cart>(
    `/cart/v1/private/cart/items/${itemId}`,
    { quantity },
  );
  return response.data;
}

/**
 * DELETE /cart/v1/private/cart/items/:itemId
 */
export async function removeCartItem(itemId: string): Promise<Cart> {
  if (import.meta.env.VITE_USE_MOCK === "true") return mock.mockRemoveCartItem(itemId);
  const response = await apiClient.delete<Cart>(
    `/cart/v1/private/cart/items/${itemId}`,
  );
  return response.data;
}

/**
 * DELETE /cart/v1/private/cart
 */
export async function clearCart(): Promise<Cart> {
  if (import.meta.env.VITE_USE_MOCK === "true") return mock.mockClearCart();
  const response = await apiClient.delete<Cart>("/cart/v1/private/cart");
  return response.data;
}
