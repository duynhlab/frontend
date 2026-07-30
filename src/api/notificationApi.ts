import type { AxiosRequestConfig } from "axios";
import apiClient from "./client";
import * as mock from "./mock";
import type { Paginated } from "./types/common";
import type {
  AppNotification,
  MarkAllReadResponse,
  NotificationCount,
} from "./types/notification";

/**
 * Notification API — Variant A edge paths (all private, JWT required).
 * Edge paths (gateway pass-through): /notification/v1/private/notifications, /count, /:id
 */

/**
 * GET /notification/v1/private/notifications
 * Paginated envelope: { items, page, page_size, total_items, total_pages }.
 */
export async function getNotifications(): Promise<AppNotification[]> {
  if (import.meta.env.VITE_USE_MOCK === "true") return mock.mockGetNotifications();
  const response = await apiClient.get<Paginated<AppNotification>>(
    "/notification/v1/private/notifications",
  );
  return response.data?.items ?? [];
}

/**
 * GET /notification/v1/private/notifications/:id
 */
export async function getNotification(id: string): Promise<AppNotification> {
  if (import.meta.env.VITE_USE_MOCK === "true") return mock.mockGetNotification(id);
  const response = await apiClient.get<AppNotification>(
    `/notification/v1/private/notifications/${id}`,
  );
  return response.data;
}

/**
 * PATCH /notification/v1/private/notifications/:id
 */
export async function markAsRead(id: string): Promise<AppNotification> {
  if (import.meta.env.VITE_USE_MOCK === "true") return mock.mockMarkAsRead(id);
  const response = await apiClient.patch<AppNotification>(
    `/notification/v1/private/notifications/${id}`,
  );
  return response.data;
}

/**
 * PATCH /notification/v1/private/notifications/read-all
 * Marks every unread notification for the user as read in one request.
 * Returns { updated: <count> }.
 */
export async function markAllAsRead(): Promise<MarkAllReadResponse> {
  if (import.meta.env.VITE_USE_MOCK === "true") return mock.mockMarkAllAsRead();
  const response = await apiClient.patch<MarkAllReadResponse>(
    "/notification/v1/private/notifications/read-all",
  );
  return response.data;
}

/**
 * GET /notification/v1/private/notifications/count
 * Called by the bell-badge on a short poll; pass `skipAuthRefresh` so that
 * a 401 here does not yank the user to /login.
 */
export async function getNotificationCount(
  config: AxiosRequestConfig = {},
): Promise<NotificationCount> {
  if (import.meta.env.VITE_USE_MOCK === "true") return mock.mockGetNotificationCount();
  const response = await apiClient.get<NotificationCount>(
    "/notification/v1/private/notifications/count",
    config,
  );
  return response.data;
}
