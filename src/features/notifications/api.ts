import { apiFetch, type Paginated } from '@/lib/api'

/** Notification history — Variant A edge paths, all private. */

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  status: string
  read: boolean
  created_at: string
}

const BASE = '/notification/v1/private/notifications'

export function listNotifications(
  signal?: AbortSignal,
): Promise<Paginated<Notification>> {
  return apiFetch<Paginated<Notification>>(BASE, { signal })
}

/** The bell badge polls this; background so it cannot bounce the shopper. */
export function getNotificationCount(
  signal?: AbortSignal,
): Promise<{ count: number }> {
  return apiFetch<{ count: number }>(`${BASE}/count`, {
    signal,
    background: true,
  })
}

export function markAsRead(id: string): Promise<unknown> {
  return apiFetch<unknown>(`${BASE}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
  })
}

export function markAllAsRead(): Promise<{ updated: number }> {
  return apiFetch<{ updated: number }>(`${BASE}/read-all`, { method: 'PATCH' })
}
