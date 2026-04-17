import apiClient from './client';

/**
 * Review API — Variant A edge paths.
 * Cluster mounts (reference): /api/v1/reviews
 */

/**
 * GET /review/v1/public/reviews?product_id={id}  →  /api/v1/reviews
 */
export async function getReviews(productId) {
    const response = await apiClient.get('/review/v1/public/reviews', {
        params: { product_id: productId }
    });
    return response.data;
}

/**
 * POST /review/v1/private/reviews  →  /api/v1/reviews
 */
export async function createReview(productId, userId, rating, title, comment) {
    const response = await apiClient.post('/review/v1/private/reviews', {
        product_id: productId,
        user_id: userId,
        rating,
        title,
        comment
    });
    return response.data;
}
