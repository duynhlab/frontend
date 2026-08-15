import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/pagination'
import { StatusChip } from '@/components/status-chip'
import { EmptyState, ErrorState, LineSkeleton } from '@/components/states'
import { ordersQuery } from '@/features/orders/queries'
import { useAuth } from '@/hooks/use-auth'
import { auth } from '@/lib/auth'
import { formatDateTime, formatMoney } from '@/lib/format'

const searchSchema = z.object({
  page: z.number().int().min(1).catch(1).default(1),
})

export const Route = createFileRoute('/orders')({
  validateSearch: searchSchema,
  component: Orders,
})

function Orders() {
  const { page } = Route.useSearch()
  const navigate = useNavigate({ from: '/orders' })
  const { isAuthenticated } = useAuth()

  const query = useQuery(ordersQuery(page, isAuthenticated))

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">Your orders</h1>
        <EmptyState
          title="Sign in to see your orders"
          action={<Button onClick={() => auth.login('/orders')}>Sign in</Button>}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Your orders</h1>

      {query.isPending ? <LineSkeleton rows={5} /> : null}

      {query.isError && !query.data ? (
        <ErrorState
          error={query.error}
          fallback="Your orders could not be loaded."
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {query.data && query.data.items.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description="Orders you place will show up here."
          action={
            <Button variant="outline" render={<Link to="/products" />}>
              Browse the store
            </Button>
          }
        />
      ) : null}

      {query.data && query.data.items.length > 0 ? (
        <>
          <ul className="divide-y rounded-xl border">
            {query.data.items.map((order) => (
              <li key={order.id}>
                <Link
                  to="/orders/$orderId"
                  params={{ orderId: order.id }}
                  className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-sm font-medium">Order #{order.id}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(order.created_at)}
                    </span>
                  </span>
                  <StatusChip status={order.status} />
                  <span className="w-24 text-right text-sm font-medium tabular-nums">
                    {formatMoney(order.total)}
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className="size-4 text-muted-foreground"
                  />
                </Link>
              </li>
            ))}
          </ul>
          <Pagination
            page={query.data.page}
            totalPages={query.data.total_pages}
            onChange={(next) => void navigate({ search: { page: next } })}
          />
        </>
      ) : null}
    </div>
  )
}
