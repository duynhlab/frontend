import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/ui/toast'
import { StatusChip } from '@/components/status-chip'
import { EmptyState, ErrorState, LineSkeleton } from '@/components/states'
import { canCancel, cancelOrder } from '@/features/orders/api'
import { orderDetailsQuery, orderKeys } from '@/features/orders/queries'
import { useAuth } from '@/hooks/use-auth'
import { ApiError } from '@/lib/api'
import { auth } from '@/lib/auth'
import { errorCopy } from '@/lib/error-copy'
import { formatDateTime, formatMoney } from '@/lib/format'

export const Route = createFileRoute('/orders_/$orderId')({
  component: OrderDetail,
})

/**
 * A block that failed to load is not a block that is empty. `undefined` here
 * means the enrichment read degraded — saying "unavailable" is honest, saying
 * "no shipment" would be a claim about the order.
 */
function Block({
  title,
  degraded,
  children,
}: {
  title: string
  degraded: boolean
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-2 rounded-xl border p-4">
      <h2 className="text-sm font-medium">{title}</h2>
      {degraded ? (
        <p className="text-[13px] text-warning-on-tint">
          ⚠ This information is unavailable right now — it may still exist.
        </p>
      ) : (
        children
      )}
    </section>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}

function OrderDetail() {
  const { orderId } = Route.useParams()
  const { isAuthenticated } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery(orderDetailsQuery(orderId, isAuthenticated))

  const cancel = useMutation({
    mutationFn: () => cancelOrder(orderId),
    onSuccess: () => {
      toast.add({
        title: 'Cancellation requested',
        description: 'It can take a moment to work through the order pipeline.',
        type: 'success',
      })
      void queryClient.invalidateQueries({ queryKey: orderKeys.all })
    },
    onError: (error) => {
      // These two are refusals, not faults: the order simply moved on.
      const code = error instanceof ApiError ? error.code : ''
      const known =
        code === 'ORDER_NOT_CANCELLABLE' || code === 'SHIPMENT_ALREADY_DISPATCHED'
      toast.add({
        title: errorCopy(error, 'The order could not be cancelled.'),
        type: known ? 'info' : 'error',
      })
      if (known) void queryClient.invalidateQueries({ queryKey: orderKeys.all })
    },
  })

  if (!isAuthenticated) {
    return (
      <EmptyState
        title="Sign in to see this order"
        action={<Button onClick={() => auth.login(`/orders/${orderId}`)}>Sign in</Button>}
      />
    )
  }

  if (query.isPending) return <LineSkeleton rows={8} />

  if (query.isError) {
    const missing = query.error instanceof ApiError && query.error.status === 404
    return missing ? (
      <EmptyState
        title="Order not found"
        action={
          <Button variant="outline" render={<Link to="/orders" search={{ page: 1 }} />}>
            Back to orders
          </Button>
        }
      />
    ) : (
      <ErrorState
        error={query.error}
        fallback="This order could not be loaded."
        onRetry={() => void query.refetch()}
      />
    )
  }

  const { order, shipment, payment, processing } = query.data
  const degraded = new Set(query.data.degraded ?? [])

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/orders"
        search={{ page: 1 }}
        className="inline-flex w-fit items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Back to orders
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Order #{order.id}</h1>
        <StatusChip status={order.status} />
      </div>
      <p className="text-sm text-muted-foreground">
        Placed {formatDateTime(order.created_at)}
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="flex flex-col gap-3 rounded-xl border p-4 md:col-span-2">
          <h2 className="text-sm font-medium">Items</h2>
          <ul className="flex flex-col gap-2">
            {order.items.map((line) => (
              <li key={line.product_id} className="flex justify-between gap-3 text-sm">
                <Link
                  to="/products/$productId"
                  params={{ productId: line.product_id }}
                  className="min-w-0 underline-offset-4 hover:underline"
                >
                  {line.product_name}{' '}
                  <span className="text-muted-foreground">× {line.quantity}</span>
                </Link>
                <span className="tabular-nums">{formatMoney(line.subtotal)}</span>
              </li>
            ))}
          </ul>
          <Separator />
          <Field label="Subtotal" value={<span className="tabular-nums">{formatMoney(order.subtotal)}</span>} />
          <Field label="Shipping" value={<span className="tabular-nums">{formatMoney(order.shipping)}</span>} />
          <Separator />
          <div className="flex justify-between text-sm font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatMoney(order.total)}</span>
          </div>
        </section>

        <Block title="Shipment" degraded={degraded.has('shipment')}>
          {shipment ? (
            <div className="flex flex-col gap-2">
              <StatusChip status={shipment.status} />
              <Field label="Carrier" value={shipment.carrier} />
              <Field
                label="Tracking"
                value={<span className="font-mono text-xs">{shipment.tracking_number}</span>}
              />
              {shipment.estimated_delivery ? (
                <Field
                  label="Estimated delivery"
                  value={formatDateTime(shipment.estimated_delivery)}
                />
              ) : null}
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground">
              No shipment has been created yet.
            </p>
          )}
        </Block>

        <Block title="Payment" degraded={degraded.has('payment')}>
          {payment ? (
            <div className="flex flex-col gap-2">
              <StatusChip status={payment.status} />
              <Field
                label="Amount"
                value={<span className="tabular-nums">{formatMoney(payment.amount)}</span>}
              />
              {payment.refunded ? (
                <Field
                  label="Refunded"
                  value={<span className="tabular-nums">{formatMoney(payment.refunded)}</span>}
                />
              ) : null}
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground">
              No payment has been recorded yet.
            </p>
          )}
        </Block>

        {processing && processing.stage !== 'DONE' ? (
          <Block title="Processing" degraded={degraded.has('processing')}>
            <div className="flex flex-col gap-2">
              <p className="text-[13px] text-muted-foreground">
                This order is still working through fulfilment.
              </p>
              <Field label="Stage" value={processing.stage} />
              {processing.last_step ? (
                <Field label="Last step" value={processing.last_step} />
              ) : null}
            </div>
          </Block>
        ) : null}
      </div>

      {canCancel(order.status) ? (
        <Button
          variant="outline"
          className="w-fit"
          disabled={cancel.isPending}
          onClick={() => cancel.mutate()}
        >
          {cancel.isPending ? 'Requesting…' : 'Cancel this order'}
        </Button>
      ) : null}
    </div>
  )
}
