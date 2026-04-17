import apiClient from './client';

/**
 * Shipping API — Variant A edge paths (all public).
 * Cluster mounts (reference): /api/v1/shipping/track, /api/v1/shipping/estimate
 *
 * Internal `/api/v1/shipping/orders/:orderId` is NOT routed through the
 * gateway; order-service calls it via in-cluster DNS.
 */

/**
 * GET /shipping/v1/public/track?tracking_number={number}  →  /api/v1/shipping/track
 */
export async function trackShipment(trackingNumber) {
    const response = await apiClient.get('/shipping/v1/public/track', {
        params: { tracking_number: trackingNumber }
    });
    return response.data;
}

/**
 * GET /shipping/v1/public/estimate?origin&destination&weight  →  /api/v1/shipping/estimate
 */
export async function estimateShipment(origin, destination, weight) {
    const response = await apiClient.get('/shipping/v1/public/estimate', {
        params: { origin, destination, weight }
    });
    return response.data;
}
