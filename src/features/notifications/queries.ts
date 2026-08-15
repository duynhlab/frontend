import { queryOptions } from '@tanstack/react-query'
import {
  getNotificationCount,
  listNotifications,
} from '@/features/notifications/api'

export const notificationKeys = {
  all: ['notifications'] as const,
  list: ['notifications', 'list'] as const,
  count: ['notifications', 'count'] as const,
}

export function notificationsQuery(enabled: boolean) {
  return queryOptions({
    queryKey: notificationKeys.list,
    queryFn: ({ signal }) => listNotifications(signal),
    enabled,
  })
}

/** Polled less often than the cart — a notification is rarely urgent. */
export function notificationCountQuery(enabled: boolean) {
  return queryOptions({
    queryKey: notificationKeys.count,
    queryFn: ({ signal }) => getNotificationCount(signal),
    enabled,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
}
