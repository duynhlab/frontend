import apiClient from './client';

/**
 * Cart API — Variant A edge paths (all private, JWT required).
 * Cluster mounts (reference): /api/v1/cart, /api/v1/cart/count, /api/v1/cart/items/:itemId
 */

/**
 * GET /cart/v1/private/cart  →  /api/v1/cart
 */
export async function getCart() {
    const response = await apiClient.get('/cart/v1/private/cart');
    return response.data;
}

/**
 * GET /cart/v1/private/cart/count  →  /api/v1/cart/count
 * Called by the cart badge on a short poll; passes `skipAuthRefresh` so that
 * a 401 here does not yank the user to /login.
 */
export async function getCartCount(config = {}) {
    const response = await apiClient.get('/cart/v1/private/cart/count', config);
    return response.data;
}

/**
 * POST /cart/v1/private/cart  →  /api/v1/cart
 */
export async function addToCart(productId, productName, productPrice, quantity = 1) {
    const response = await apiClient.post('/cart/v1/private/cart', {
        product_id: productId,
        product_name: productName,
        product_price: productPrice,
        quantity
    });
    return response.data;
}

/**
 * PATCH /cart/v1/private/cart/items/:itemId  →  /api/v1/cart/items/:itemId
 */
export async function updateCartItem(itemId, quantity) {
    const response = await apiClient.patch(`/cart/v1/private/cart/items/${itemId}`, { quantity });
    return response.data;
}

/**
 * DELETE /cart/v1/private/cart/items/:itemId  →  /api/v1/cart/items/:itemId
 */
export async function removeCartItem(itemId) {
    const response = await apiClient.delete(`/cart/v1/private/cart/items/${itemId}`);
    return response.data;
}

/**
 * DELETE /cart/v1/private/cart  →  /api/v1/cart
 */
export async function clearCart() {
    const response = await apiClient.delete('/cart/v1/private/cart');
    return response.data;
}
