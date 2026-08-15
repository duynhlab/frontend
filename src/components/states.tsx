import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { errorCopy } from '@/lib/error-copy'
import { cn } from '@/lib/utils'

/**
 * The four states every remote view needs, in one place so they look the same
 * everywhere: loading, empty, failed, and — the one that is easy to forget —
 * failed-while-showing-stale-data.
 */

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-16 text-center"
    >
      <p className="text-sm font-medium">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

export function ErrorState({
  error,
  fallback,
  onRetry,
}: {
  error: unknown
  fallback?: string
  onRetry?: () => void
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center"
    >
      <p className="text-sm font-medium text-destructive-on-tint">
        {errorCopy(error, fallback)}
      </p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  )
}

/** Shown above stale content when a background refresh failed. */
export function StaleNotice({ onRetry }: { onRetry: () => void }) {
  return (
    <p
      role="status"
      className="flex items-center justify-between gap-3 rounded-lg bg-warning/10 px-3 py-2 text-[13px] text-warning-on-tint"
    >
      <span>Showing the last known data — the refresh did not go through.</span>
      <Button variant="ghost" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </p>
  )
}

/**
 * Card skeletons matching the tile geometry, so nothing shifts when the real
 * grid replaces them.
 */
export function GridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading products"
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  )
}

export function LineSkeleton({
  rows = 3,
  className,
}: {
  rows?: number
  className?: string
}) {
  return (
    <div aria-busy="true" className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  )
}
