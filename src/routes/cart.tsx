import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/ui/toast'
import { EmptyState, ErrorState, LineSkeleton } from '@/components/states'
import {
  countUnits,
  removeCartItem,
  updateCartItem,
  type CartItem,
} from '@/features/cart/api'
import { cartKeys, cartQuery } from '@/features/cart/queries'
import { useAuth } from '@/hooks/use-auth'
import { auth } from '@/lib/auth'
import { errorCopy } from '@/lib/error-copy'
import { formatMoney } from '@/lib/format'

export const Route = createFileRoute('/cart')({
  component: CartPage,
})

function Row({
  item,
  busy,
  onQuantity,
  onRemove,
}: {
  item: CartItem
  busy: boolean
  onQuantity: (quantity: number) => void
  onRemove: () => void
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 py-4">
      <div className="min-w-0 flex-1">
        <Link
          to="/products/$productId"
          params={{ productId: item.product_id }}
          className="text-sm font-medium underline-offset-4 hover:underline"
        >
          {item.product_name}
        </Link>
        <p className="text-[13px] text-muted-foreground">
          {formatMoney(item.product_price)} each
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="icon"
          aria-label={`Decrease quantity of ${item.product_name}`}
          disabled={busy || item.quantity <= 1}
          onClick={() => onQuantity(item.quantity - 1)}
        >
          <Minus className="size-4" />
        </Button>
        <span className="w-8 text-center text-sm tabular-nums">
          {item.quantity}
        </span>
        <Button
          variant="outline"
          size="icon"
          aria-label={`Increase quantity of ${item.product_name}`}
          disabled={busy}
          onClick={() => onQuantity(item.quantity + 1)}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <span className="w-24 text-right text-sm font-medium tabular-nums">
        {formatMoney(item.subtotal)}
      </span>

      <Button
        variant="ghost"
        size="icon"
        aria-label={`Remove ${item.product_name}`}
        disabled={busy}
        onClick={onRemove}
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  )
}

function CartPage() {
  const { isAuthenticated } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({ ...cartQuery(), enabled: isAuthenticated })

  /**
   * The writes acknowledge but do not return the cart, so re-read it and take
   * the badge from THAT — not from a local increment. A cart edited in another
   * tab cannot then drift away from the number in the header.
   */
  const settle = async () => {
    // staleTime: 0 is load-bearing. fetchQuery honours the client's 15s
    // staleTime, so without it a write made seconds after the page loaded
    // resolves straight from cache: the request succeeds, the server changes,
    // and the screen sits there showing the old quantity.
    const cart = await queryClient.fetchQuery({ ...cartQuery(), staleTime: 0 })
    queryClient.setQueryData(cartKeys.count, { count: countUnits(cart) })
  }

  const update = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      updateCartItem(itemId, quantity),
    onSuccess: settle,
    onError: (error) =>
      toast.add({
        title: errorCopy(error, 'The quantity could not be changed.'),
        type: 'error',
      }),
  })

  const remove = useMutation({
    mutationFn: (itemId: string) => removeCartItem(itemId),
    onSuccess: async () => {
      await settle()
      toast.add({ title: 'Removed from cart', type: 'success' })
    },
    onError: (error) =>
      toast.add({
        title: errorCopy(error, 'The item could not be removed.'),
        type: 'error',
      }),
  })

  // Only the line being changed is disabled, so a slow update on one row does
  // not freeze the whole cart.
  const busyItemId =
    (update.isPending ? update.variables.itemId : undefined) ??
    (remove.isPending ? remove.variables : undefined)

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">Your cart</h1>
        <EmptyState
          title="Sign in to see your cart"
          description="Your cart follows your account, not this browser."
          action={
            <Button onClick={() => auth.login('/cart')}>Sign in</Button>
          }
        />
      </div>
    )
  }

  const cart = query.data
  const items = cart?.items ?? []

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Your cart</h1>

      {query.isPending ? <LineSkeleton rows={5} /> : null}

      {query.isError && !cart ? (
        <ErrorState
          error={query.error}
          fallback="Your cart could not be loaded."
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {cart && items.length === 0 ? (
        <EmptyState
          title="Your cart is empty"
          description="Nothing here yet."
          action={
            <Button variant="outline" render={<Link to="/products" />}>
              Browse the store
            </Button>
          }
        />
      ) : null}

      {cart && items.length > 0 ? (
        <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
          <section aria-label="Cart items">
            <p className="text-sm text-muted-foreground">
              {cart.item_count} line{cart.item_count === 1 ? '' : 's'} ·{' '}
              {countUnits(cart)} item{countUnits(cart) === 1 ? '' : 's'}
            </p>
            <ul className="divide-y">
              {items.map((item) => (
                <Row
                  key={item.id}
                  item={item}
                  busy={busyItemId === item.id}
                  onQuantity={(quantity) =>
                    update.mutate({ itemId: item.id, quantity })
                  }
                  onRemove={() => remove.mutate(item.id)}
                />
              ))}
            </ul>
          </section>

          <aside className="h-fit rounded-xl border p-4">
            <h2 className="text-sm font-medium">Order summary</h2>
            {/* The separator lives outside the <dl>: a definition list may
                only directly contain dt/dd groups wrapped in div, and axe
                flags anything else as a serious violation. */}
            <dl className="mt-3 flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular-nums">{formatMoney(cart.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Shipping</dt>
                <dd className="tabular-nums">{formatMoney(cart.shipping)}</dd>
              </div>
            </dl>
            <Separator className="my-2" />
            <dl className="flex justify-between text-sm font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatMoney(cart.total)}</dd>
            </dl>
            <Button className="mt-4 w-full" render={<Link to="/checkout" />}>
              Proceed to checkout
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              Shipping and totals are re-quoted at checkout against live prices.
            </p>
          </aside>
        </div>
      ) : null}
    </div>
  )
}
