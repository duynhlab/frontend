import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { EmptyState, ErrorState, LineSkeleton } from '@/components/states'
import { markAllAsRead, markAsRead } from '@/features/notifications/api'
import {
  notificationKeys,
  notificationsQuery,
} from '@/features/notifications/queries'
import { useAuth } from '@/hooks/use-auth'
import { auth } from '@/lib/auth'
import { errorCopy } from '@/lib/error-copy'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/notifications')({
  component: Notifications,
})

/**
 * The gateway limits this client to roughly 5 requests a second, and marking a
 * screenful of notifications read means one PATCH per row. Firing them all at
 * once earns a wall of 429s, so the queue paces them.
 */
const PACE_MS = 220
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function Notifications() {
  const { isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)

  const query = useQuery(notificationsQuery(isAuthenticated))

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: notificationKeys.all })
  }

  const readOne = async (id: string) => {
    setBusy(true)
    try {
      await markAsRead(id)
    } catch (error) {
      toast.add({
        title: errorCopy(error, 'That could not be marked as read.'),
        type: 'error',
      })
    } finally {
      // Always reconcile, even after a failure: half the batch may have landed.
      await refresh()
      setBusy(false)
    }
  }

  const readAll = async () => {
    setBusy(true)
    try {
      await markAllAsRead()
    } catch {
      // No bulk endpoint answer to lean on — fall back to one call per unread
      // row, paced, rather than leaving the shopper with a dead button.
      const unread = (query.data?.items ?? []).filter((n) => !n.read)
      for (const [index, item] of unread.entries()) {
        if (index > 0) await wait(PACE_MS)
        try {
          await markAsRead(item.id)
        } catch {
          // Keep going: one refusal should not strand the rest.
        }
      }
    } finally {
      await refresh()
      setBusy(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <EmptyState
          title="Sign in to see your notifications"
          action={
            <Button onClick={() => auth.login('/notifications')}>Sign in</Button>
          }
        />
      </div>
    )
  }

  const items = query.data?.items ?? []
  const unreadCount = items.filter((n) => !n.read).length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        {unreadCount > 0 ? (
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void readAll()}
          >
            Mark all as read ({unreadCount})
          </Button>
        ) : null}
      </div>

      {query.isPending ? <LineSkeleton rows={5} /> : null}

      {query.isError && !query.data ? (
        <ErrorState
          error={query.error}
          fallback="Your notifications could not be loaded."
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {query.data && items.length === 0 ? (
        <EmptyState
          title="Nothing yet"
          description="Order and delivery updates will appear here."
        />
      ) : null}

      {items.length > 0 ? (
        <ul className="divide-y rounded-xl border">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                'flex flex-wrap items-start gap-3 px-4 py-3',
                !item.read && 'bg-primary/5',
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium">
                  {!item.read ? (
                    <span
                      aria-hidden="true"
                      className="size-1.5 shrink-0 rounded-full bg-primary"
                    />
                  ) : null}
                  {item.title}
                  {!item.read ? <span className="sr-only">(unread)</span> : null}
                </p>
                <p className="text-[13px] text-muted-foreground">{item.message}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(item.created_at)}
                </p>
              </div>
              {!item.read ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => void readOne(item.id)}
                >
                  Mark as read
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
