import apiClient from './client';
import { USE_MOCK } from './useMock';
import * as mock from './mock';

/**
 * Product API — Variant A edge paths (all public).
 * Edge paths (gateway pass-through): /product/v1/public/products, /products/:id, /products/:id/details
 *
 * When VITE_USE_MOCK=true, all product calls use the in-memory mock store.
 */

/**
 * GET /product/v1/public/products
 * Returns the paginated envelope { items, page, page_size, total_items, total_pages };
 * callers read the array from `.items` (see useProducts).
 */
export async function getProducts(params = {}) {
    if (USE_MOCK) return mock.mockGetProducts(params);
    const response = await apiClient.get('/product/v1/public/products', { params });
    return response.data;
}

/**
 * GET /product/v1/public/products/:id
 */
export async function getProduct(id) {
    if (USE_MOCK) return mock.mockGetProduct(id);
    const response = await apiClient.get(`/product/v1/public/products/${id}`);
    return response.data;
}

/**
 * GET /product/v1/public/products/:id/details
 * Aggregation endpoint — use this for the Product Detail Page.
 */
export async function getProductDetails(id) {
    if (USE_MOCK) return mock.mockGetProductDetails(id);
    const response = await apiClient.get(`/product/v1/public/products/${id}/details`);
    return response.data;
}
