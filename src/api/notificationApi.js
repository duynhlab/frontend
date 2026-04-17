import apiClient from './client';

/**
 * Notification API — Variant A edge paths (all private, JWT required).
 * Cluster mounts (reference): /api/v1/notifications, /api/v1/notifications/count, /api/v1/notifications/:id
 *
 * Internal `/api/v1/notify/{email,sms}` endpoints are NOT routed through the
 * gateway; they are service-to-service only.
 */

/**
 * GET /notification/v1/private/notifications  →  /api/v1/notifications
 */
export async function getNotifications() {
    const response = await apiClient.get('/notification/v1/private/notifications');
    return response.data;
}

/**
 * GET /notification/v1/private/notifications/:id  →  /api/v1/notifications/:id
 */
export async function getNotification(id) {
    const response = await apiClient.get(`/notification/v1/private/notifications/${id}`);
    return response.data;
}

/**
 * PATCH /notification/v1/private/notifications/:id  →  /api/v1/notifications/:id
 */
export async function markAsRead(id) {
    const response = await apiClient.patch(`/notification/v1/private/notifications/${id}`);
    return response.data;
}

/**
 * GET /notification/v1/private/notifications/count  →  /api/v1/notifications/count
 * Called by the bell-badge on a short poll; pass `skipAuthRefresh` so that
 * a 401 here does not yank the user to /login.
 */
export async function getNotificationCount(config = {}) {
    const response = await apiClient.get('/notification/v1/private/notifications/count', config);
    return response.data;
}
