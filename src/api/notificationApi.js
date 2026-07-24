import apiClient from './client';
import { USE_MOCK } from './useMock';
import * as mock from './mock';

/**
 * Notification API — Variant A edge paths (all private, JWT required).
 * Edge paths (gateway pass-through): /notification/v1/private/notifications, /count, /:id
 */

/**
 * GET /notification/v1/private/notifications
 * Paginated envelope: { items, page, page_size, total_items, total_pages }.
 */
export async function getNotifications() {
    if (USE_MOCK) return mock.mockGetNotifications();
    const response = await apiClient.get('/notification/v1/private/notifications');
    return response.data?.items ?? [];
}

/**
 * GET /notification/v1/private/notifications/:id
 */
export async function getNotification(id) {
    if (USE_MOCK) return mock.mockGetNotification(id);
    const response = await apiClient.get(`/notification/v1/private/notifications/${id}`);
    return response.data;
}

/**
 * PATCH /notification/v1/private/notifications/:id
 */
export async function markAsRead(id) {
    if (USE_MOCK) return mock.mockMarkAsRead(id);
    const response = await apiClient.patch(`/notification/v1/private/notifications/${id}`);
    return response.data;
}

/**
 * PATCH /notification/v1/private/notifications/read-all
 * Marks every unread notification for the user as read in one request.
 * Returns { updated: <count> }.
 */
export async function markAllAsRead() {
    if (USE_MOCK) return mock.mockMarkAllAsRead();
    const response = await apiClient.patch('/notification/v1/private/notifications/read-all');
    return response.data;
}

/**
 * GET /notification/v1/private/notifications/count
 * Called by the bell-badge on a short poll; pass `skipAuthRefresh` so that
 * a 401 here does not yank the user to /login.
 */
export async function getNotificationCount(config = {}) {
    if (USE_MOCK) return mock.mockGetNotificationCount();
    const response = await apiClient.get('/notification/v1/private/notifications/count', config);
    return response.data;
}
