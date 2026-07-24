import apiClient from './client';
import { USE_MOCK } from './useMock';
import * as mock from './mock';

/**
 * Cart API — Variant A edge paths (all private, JWT required).
 * Edge paths (gateway pass-through): /cart/v1/private/cart, /cart/count, /cart/items/:itemId
 */

/**
 * GET /cart/v1/private/cart
 */
export async function getCart() {
    if (USE_MOCK) return mock.mockGetCart();
    const response = await apiClient.get('/cart/v1/private/cart');
    return response.data;
}

/**
 * GET /cart/v1/private/cart/count
 * Called by the cart badge on a short poll; passes `skipAuthRefresh` so that
 * a 401 here does not yank the user to /login.
 */
export async function getCartCount(config = {}) {
    if (USE_MOCK) return mock.mockGetCartCount();
    const response = await apiClient.get('/cart/v1/private/cart/count', config);
    return response.data;
}

/**
 * POST /cart/v1/private/cart
 */
export async function addToCart(productId, productName, productPrice, quantity = 1) {
    if (USE_MOCK) return mock.mockAddToCart(productId, productName, productPrice, quantity);
    const response = await apiClient.post('/cart/v1/private/cart', {
        product_id: productId,
        product_name: productName,
        product_price: productPrice,
        quantity
    });
    return response.data;
}

/**
 * PATCH /cart/v1/private/cart/items/:itemId
 */
export async function updateCartItem(itemId, quantity) {
    if (USE_MOCK) return mock.mockUpdateCartItem(itemId, quantity);
    const response = await apiClient.patch(`/cart/v1/private/cart/items/${itemId}`, { quantity });
    return response.data;
}

/**
 * DELETE /cart/v1/private/cart/items/:itemId
 */
export async function removeCartItem(itemId) {
    if (USE_MOCK) return mock.mockRemoveCartItem(itemId);
    const response = await apiClient.delete(`/cart/v1/private/cart/items/${itemId}`);
    return response.data;
}

/**
 * DELETE /cart/v1/private/cart
 */
export async function clearCart() {
    if (USE_MOCK) return mock.mockClearCart();
    const response = await apiClient.delete('/cart/v1/private/cart');
    return response.data;
}
