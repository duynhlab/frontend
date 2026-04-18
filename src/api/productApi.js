import apiClient from './client';
import { mockGetProducts } from './mockData';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

/**
 * Product API — Variant A edge paths (all public).
 * Cluster mounts (reference): /api/v1/products, /api/v1/products/:id, /api/v1/products/:id/details
 *
 * When VITE_USE_MOCK=true, getProducts returns mock data without touching the network.
 */

/**
 * GET /product/v1/public/products  →  /api/v1/products
 */
export async function getProducts(params = {}) {
    if (USE_MOCK) {
        return mockGetProducts(params);
    }
    const response = await apiClient.get('/product/v1/public/products', { params });
    return response.data;
}

/**
 * GET /product/v1/public/products/:id  →  /api/v1/products/:id
 */
export async function getProduct(id) {
    const response = await apiClient.get(`/product/v1/public/products/${id}`);
    return response.data;
}

/**
 * GET /product/v1/public/products/:id/details  →  /api/v1/products/:id/details
 * Aggregation endpoint — use this for the Product Detail Page.
 */
export async function getProductDetails(id) {
    const response = await apiClient.get(`/product/v1/public/products/${id}/details`);
    return response.data;
}
