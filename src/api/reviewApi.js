import apiClient from './client';
import { USE_MOCK } from './useMock';
import * as mock from './mock';

/**
 * Review API — Variant A edge paths.
 * Edge paths (gateway pass-through): /review/v1/public/reviews (GET), /review/v1/private/reviews (POST)
 */

/**
 * GET /review/v1/public/reviews?product_id={id}
 * Paginated envelope: { items, page, page_size, total_items, total_pages }.
 */
export async function getReviews(productId) {
    if (USE_MOCK) return mock.mockGetReviews(productId);
    const response = await apiClient.get('/review/v1/public/reviews', {
        params: { product_id: productId }
    });
    return response.data?.items ?? [];
}

/**
 * POST /review/v1/private/reviews
 */
export async function createReview(productId, userId, rating, title, comment) {
    if (USE_MOCK) {
        return mock.mockCreateReview(productId, userId, rating, title, comment);
    }
    const response = await apiClient.post('/review/v1/private/reviews', {
        product_id: productId,
        user_id: userId,
        rating,
        title,
        comment
    });
    return response.data;
}
