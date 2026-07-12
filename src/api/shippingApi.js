import apiClient from './client';

/**
 * Shipping API — Variant A edge paths (all public).
 * Edge paths (gateway pass-through): /shipping/v1/public/shipments/track, /shipping/v1/public/shipments/estimate
 *
 * Internal `/api/v1/shipping/orders/:orderId` is NOT routed through the
 * gateway; order-service calls it via in-cluster DNS.
 */

/**
 * GET /shipping/v1/public/shipments/track?tracking_number={number}
 */
export async function trackShipment(trackingNumber) {
    const response = await apiClient.get('/shipping/v1/public/shipments/track', {
        params: { tracking_number: trackingNumber }
    });
    return response.data;
}

/**
 * GET /shipping/v1/public/shipments/estimate?origin&destination&weight
 */
export async function estimateShipment(origin, destination, weight) {
    const response = await apiClient.get('/shipping/v1/public/shipments/estimate', {
        params: { origin, destination, weight }
    });
    return response.data;
}
