import { useCallback, useEffect, useRef, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, CircleAlert, Info } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/ui/toast'
import { EmptyState, LineSkeleton } from '@/components/states'
import { cartCountQuery, cartKeys } from '@/features/cart/queries'
import {
  applyPromo,
  cancelSession,
  clearIdempotencyKey,
  confirmSession,
  createSession,
  idempotencyKeyFor,
  removePromo,
  setAddress,
  setPayment,
  setShipping,
  PAYMENT_METHODS,
  SHIPPING_METHODS,
  type Address,
  type CheckoutSession,
  type SessionStatus,
} from '@/features/checkout/api'
import { useAuth } from '@/hooks/use-auth'
import { ApiError } from '@/lib/api'
import { auth } from '@/lib/auth'
import { errorCopy } from '@/lib/error-copy'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'

// `step` is INTENT only — it lets someone go back to an earlier step and
// deep-link to it. `session.status` remains the truth, and the value is
// clamped to it below, so a hand-edited ?step=4 cannot skip the funnel.
const searchSchema = z.object({
  step: z.number().int().min(1).max(4).optional().catch(undefined),
})

export const Route = createFileRoute('/checkout')({
  validateSearch: searchSchema,
  component: Checkout,
})

/** The server FSM decides how far the funnel has actually got. */
const STEP_OF_STATUS: Record<SessionStatus, number> = {
  open: 1,
  address_set: 2,
  shipping_set: 3,
  ready: 4,
  completed: 5,
  cancelled: 1,
  expired: 1,
}

const STEP_LABELS = ['Address', 'Shipping', 'Payment', 'Review']

const EMPTY_ADDRESS: Address = {
  full_name: '',
  line1: '',
  line2: '',
  city: '',
  region: '',
  post_code: '',
  country: 'VN',
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function Stepper({
  current,
  reachable,
  disabled,
  onSelect,
}: {
  current: number
  reachable: number
  disabled: boolean
  onSelect: (step: number) => void
}) {
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Checkout steps">
      {STEP_LABELS.map((label, index) => {
        const step = index + 1
        const done = step < reachable
        const active = step === current
        return (
          <li key={label} className="flex items-center gap-2">
            <Button
              variant={active ? 'default' : 'ghost'}
              size="sm"
              // Only steps the server has already accepted are reachable —
              // clicking ahead would submit into a state the FSM refuses.
              disabled={disabled || step > reachable}
              aria-current={active ? 'step' : undefined}
              onClick={() => onSelect(step)}
            >
              {done ? <Check className="size-3.5" /> : null}
              {label}
            </Button>
            {step < STEP_LABELS.length ? (
              <span aria-hidden="true" className="text-muted-foreground">
                ›
              </span>
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}

function Banner({
  tone,
  children,
}: {
  tone: 'warning' | 'info'
  children: React.ReactNode
}) {
  const Icon = tone === 'warning' ? CircleAlert : Info
  return (
    <p
      role={tone === 'warning' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2 rounded-lg px-3 py-2 text-[13px]',
        tone === 'warning'
          ? 'bg-warning/10 text-warning-on-tint'
          : 'bg-muted text-muted-foreground',
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}

function AddressFields({
  value,
  onChange,
  disabled,
}: {
  value: Address
  onChange: (next: Address) => void
  disabled: boolean
}) {
  const field = (
    name: keyof Address,
    label: string,
    opts: { required?: boolean; className?: string } = {},
  ) => (
    <div className={cn('flex flex-col gap-1.5', opts.className)}>
      <Label htmlFor={`address-${name}`}>{label}</Label>
      <Input
        id={`address-${name}`}
        value={value[name]}
        required={opts.required}
        disabled={disabled}
        onChange={(event) => onChange({ ...value, [name]: event.target.value })}
      />
    </div>
  )

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {field('full_name', 'Full name', { required: true, className: 'sm:col-span-2' })}
      {field('line1', 'Address line 1', { required: true, className: 'sm:col-span-2' })}
      {field('line2', 'Address line 2', { className: 'sm:col-span-2' })}
      {field('city', 'City', { required: true })}
      {field('region', 'Region')}
      {field('post_code', 'Post code', { required: true })}
      {field('country', 'Country', { required: true })}
    </div>
  )
}

function Checkout() {
  const { step: stepParam } = Route.useSearch()
  const navigate = useNavigate({ from: '/checkout' })
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuth()

  const [session, setSession] = useState<CheckoutSession | null>(null)
  const [loadError, setLoadError] = useState<'empty-cart' | string | null>(null)
  // Set when the load failure is the persistent ITEM_NOT_ORDERABLE conflict
  // (ADR-053): retrying cannot succeed, so the screen drops its retry button.
  const [loadNotOrderable, setLoadNotOrderable] = useState(false)
  const [busy, setBusy] = useState(false)
  const [address, setAddressForm] = useState<Address>(EMPTY_ADDRESS)
  const [shippingMethod, setShippingMethod] = useState<string>(
    SHIPPING_METHODS[0].key,
  )
  const [paymentToken, setPaymentToken] = useState<string>(
    PAYMENT_METHODS[0].token,
  )
  const [promoInput, setPromoInput] = useState('')
  const [promoError, setPromoError] = useState<string | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const booted = useRef(false)

  const cartCount = useQuery(cartCountQuery(isAuthenticated)).data?.count

  const boot = useCallback(async () => {
    setLoadError(null)
    void navigate({ search: {}, replace: true })
    try {
      const fresh = await createSession()
      setSession(fresh)
      setLoadNotOrderable(false)
      if (fresh.address) setAddressForm((prev) => ({ ...prev, ...fresh.address }))
      if (fresh.shipping_method) setShippingMethod(fresh.shipping_method)
    } catch (error) {
      if (error instanceof ApiError && error.code === 'CONFLICT') {
        setLoadError('empty-cart')
        return
      }
      setLoadNotOrderable(error instanceof ApiError && error.code === 'ITEM_NOT_ORDERABLE')
      setLoadError(errorCopy(error, 'Checkout could not be started.'))
    }
  }, [navigate])

  useEffect(() => {
    if (!isAuthenticated) return
    // Guarded: StrictMode runs effects twice in development, and a second
    // POST here would create a second session and orphan the first.
    if (booted.current) return
    booted.current = true
    void boot()
  }, [isAuthenticated, boot])

  const serverStep = session ? (STEP_OF_STATUS[session.status] ?? 1) : 1
  // Intent, clamped by truth. Rendering the clamp — not just disabling the
  // stepper button — is what makes a hand-typed ?step=4 harmless.
  const step = Math.min(stepParam ?? serverStep, serverStep)

  useEffect(() => {
    headingRef.current?.focus()
  }, [step])

  const goToStep = (next: number) => {
    // Never write the default: an absent ?step means "follow the server".
    void navigate({
      search: next === serverStep ? {} : { step: next },
      replace: true,
    })
  }

  /**
   * One place where every funnel failure is interpreted. Each branch exists
   * because the platform answers that way on purpose:
   *
   *   429 — the gateway limiter. Never retried; retrying feeds it.
   *   503 — a dependency failing over. run() already made ONE paced retry.
   *         (Since ADR-053 no checkout 503 carries a session — the untracked-SKU
   *         requote moved to the 409-with-session branch below.)
   *   410 — the session aged out. Start a fresh one, and drop the dead
   *         session's idempotency key so it does not linger forever.
   *   409 with a session — a requote. Show the new quote FIRST, then explain,
   *         and leave the idempotency key intact so the retry is the same
   *         order attempt rather than a new one.
   */
  const handleFunnelError = (error: unknown) => {
    if (error instanceof ApiError && error.status === 429) {
      toast.add({ title: error.message, type: 'info' })
      return
    }
    if (error instanceof ApiError && error.status === 503) {
      toast.add({
        title: 'The service is busy right now — please try again in a moment.',
        type: 'warning',
      })
      return
    }
    if (error instanceof ApiError && error.status === 410) {
      if (session) clearIdempotencyKey(session.id)
      toast.add({ title: errorCopy(error, 'Your checkout session expired.'), type: 'error' })
      void boot()
      return
    }
    if (error instanceof ApiError && error.session) {
      setSession(error.session as CheckoutSession)
      toast.add({ title: errorCopy(error), type: 'error' })
      return
    }
    toast.add({ title: errorCopy(error, 'That step could not be saved.'), type: 'error' })
  }

  /**
   * Funnel writes get exactly one paced retry on 503, with jitter so a whole
   * tab herd does not re-arrive in phase. Confirm does NOT go through here —
   * it is retried by the shopper, deliberately, with the same key.
   */
  const run = async (
    fn: () => Promise<CheckoutSession>,
  ): Promise<CheckoutSession | null> => {
    setBusy(true)
    try {
      try {
        const next = await fn()
        setSession(next)
        return next
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 503) throw error
        await wait(error.retryAfterMs + Math.random() * 500)
        const next = await fn()
        setSession(next)
        return next
      }
    } catch (error) {
      handleFunnelError(error)
      return null
    } finally {
      setBusy(false)
    }
  }

  const submitStep = async (fn: () => Promise<CheckoutSession>) => {
    const next = await run(fn)
    // Hand control back to the server FSM once a step lands.
    if (next) void navigate({ search: {}, replace: true })
  }

  const submitPromo = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!session || !promoInput.trim()) return
    setPromoError(null)
    setBusy(true)
    try {
      const next = await applyPromo(session.id, promoInput.trim())
      setSession(next)
      setPromoInput('')
      toast.add({ title: 'Promo applied — totals updated.', type: 'success' })
    } catch (error) {
      // A bad promo code belongs next to the field the shopper just typed in,
      // not in a toast that slides away from it.
      if (error instanceof ApiError && error.session) {
        setSession(error.session as CheckoutSession)
      }
      setPromoError(errorCopy(error, 'That code could not be applied.'))
    } finally {
      setBusy(false)
    }
  }

  const placeOrder = async () => {
    if (!session) return
    setBusy(true)
    try {
      const key = idempotencyKeyFor(session.id)
      const next = await confirmSession(session.id, key)
      setSession(next)
      clearIdempotencyKey(session.id)
      toast.add({ title: 'Order placed', type: 'success' })
      // A confirmed order consumes the cart, but cart-service clears it
      // ASYNCHRONOUSLY. Invalidating here races that: the refetch lands first,
      // reads the pre-clear count, and overwrites the zero — so the badge
      // jumps back to the old number until the next poll. Assert the outcome
      // instead, and drop the cached cart rather than re-reading it now; the
      // badge's own 10s poll is what reconciles if anything went wrong.
      queryClient.setQueryData(cartKeys.count, { count: 0 })
      queryClient.removeQueries({ queryKey: cartKeys.cart })
    } catch (error) {
      // The key is intentionally NOT cleared here: pressing Place order again
      // must be the same attempt, not a second charge.
      handleFunnelError(error)
    } finally {
      setBusy(false)
    }
  }

  const abandon = async () => {
    if (!session) return
    try {
      await cancelSession(session.id)
      clearIdempotencyKey(session.id)
      toast.add({ title: 'Checkout cancelled', type: 'success' })
      void navigate({ to: '/cart' })
    } catch (error) {
      handleFunnelError(error)
    }
  }

  /** The session pins prices at creation, so a cart edited later diverges. */
  const rebuildQuote = async () => {
    if (!session) return
    setBusy(true)
    try {
      await cancelSession(session.id)
      clearIdempotencyKey(session.id)
    } catch {
      // Already gone — nothing to cancel, carry on and make a new one.
    }
    setBusy(false)
    await boot()
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
        <EmptyState
          title="Sign in to check out"
          action={<Button onClick={() => auth.login('/checkout')}>Sign in</Button>}
        />
      </div>
    )
  }

  if (loadError === 'empty-cart') {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
        <EmptyState
          title="Your cart is empty"
          description="Add something before checking out."
          action={
            <Button variant="outline" render={<Link to="/products" />}>
              Browse the store
            </Button>
          }
        />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
          <p className="text-sm text-destructive-on-tint">{loadError}</p>
          {/* ITEM_NOT_ORDERABLE (ADR-053) is a persistent conflict: the copy
              already says what to do and a retry cannot succeed, so that case
              hides both the generic hint and the retry button. Every other
              failure keeps them — a transient 503 may well clear. */}
          {!loadNotOrderable ? (
            <p className="mt-2 text-[13px] text-muted-foreground">
              If this keeps happening, an item in your cart may not be available
              to order. Remove it and try again.
            </p>
          ) : null}
          <div className="mt-3 flex gap-2">
            {!loadNotOrderable ? (
              <Button variant="outline" size="sm" onClick={() => void boot()}>
                Try again
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" render={<Link to="/cart" />}>
              Back to cart
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
        <LineSkeleton rows={6} />
      </div>
    )
  }

  if (session.status === 'completed') {
    return (
      <div className="flex flex-col items-start gap-4">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-semibold tracking-tight outline-none"
        >
          Order placed
        </h1>
        <p className="text-sm text-muted-foreground">
          Order <span className="font-mono">{session.order_id}</span> ·{' '}
          <span className="tabular-nums">{formatMoney(session.total)}</span>
        </p>
        <div className="flex gap-2">
          <Button render={<Link to="/orders" search={{ page: 1 }} />}>View orders</Button>
          <Button variant="outline" render={<Link to="/products" />}>
            Continue shopping
          </Button>
        </div>
      </div>
    )
  }

  const priceChanged = session.items.some((item) => item.price_changed)
  const sessionUnits = session.items.reduce((n, item) => n + item.quantity, 0)
  const cartDiverged =
    Number.isFinite(cartCount) && cartCount !== sessionUnits

  return (
    <div className="flex flex-col gap-6">
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-2xl font-semibold tracking-tight outline-none"
      >
        Checkout
      </h1>

      <Stepper
        current={step}
        reachable={serverStep}
        disabled={busy}
        onSelect={goToStep}
      />

      {priceChanged ? (
        <Banner tone="warning">
          Some prices changed since you carted these items. The quote below uses
          the current catalog — the changed lines are marked.
        </Banner>
      ) : null}

      {cartDiverged ? (
        <Banner tone="info">
          Your cart changed after this quote was created, so the summary below
          does not match it.{' '}
          <button
            type="button"
            className="font-medium underline underline-offset-4"
            onClick={() => void rebuildQuote()}
          >
            Rebuild the quote
          </button>
          .
        </Banner>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <section className="flex flex-col gap-4">
          {step === 1 ? (
            <form
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault()
                void submitStep(() => setAddress(session.id, address))
              }}
            >
              <h2 className="text-sm font-medium">Delivery address</h2>
              <AddressFields
                value={address}
                onChange={setAddressForm}
                disabled={busy}
              />
              <Button type="submit" className="self-start" disabled={busy}>
                Continue to shipping
              </Button>
            </form>
          ) : null}

          {step === 2 ? (
            <form
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault()
                void submitStep(() => setShipping(session.id, shippingMethod))
              }}
            >
              <h2 className="text-sm font-medium">Shipping method</h2>
              <div className="flex flex-col gap-2">
                {SHIPPING_METHODS.map((method) => (
                  <label
                    key={method.key}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                  >
                    <input
                      type="radio"
                      name="shipping"
                      value={method.key}
                      checked={shippingMethod === method.key}
                      disabled={busy}
                      onChange={() => setShippingMethod(method.key)}
                    />
                    {method.label}
                  </label>
                ))}
              </div>
              <Button type="submit" className="self-start" disabled={busy}>
                Continue to payment
              </Button>
            </form>
          ) : null}

          {step === 3 ? (
            <form
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault()
                void submitStep(() => setPayment(session.id, paymentToken))
              }}
            >
              <h2 className="text-sm font-medium">Payment method</h2>
              <div className="flex flex-col gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <label
                    key={method.token}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={method.token}
                      checked={paymentToken === method.token}
                      disabled={busy}
                      onChange={() => setPaymentToken(method.token)}
                    />
                    {method.label}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                These are opaque test tokens. No card details are entered, sent,
                or stored by this app.
              </p>
              <Button type="submit" className="self-start" disabled={busy}>
                Continue to review
              </Button>
            </form>
          ) : null}

          {step === 4 ? (
            <div className="flex flex-col gap-4">
              <h2 className="text-sm font-medium">Review and place your order</h2>
              {session.address ? (
                <div className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">{session.address.full_name}</p>
                  <p className="text-muted-foreground">
                    {[
                      session.address.line1,
                      session.address.line2,
                      session.address.city,
                      session.address.region,
                      session.address.post_code,
                      session.address.country,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
              ) : null}
              <p className="text-sm text-muted-foreground">
                Shipping: {session.shipping_method ?? '—'}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button disabled={busy} onClick={() => void placeOrder()}>
                  {busy ? 'Placing order…' : 'Place order'}
                </Button>
                <Button variant="ghost" disabled={busy} onClick={() => void abandon()}>
                  Cancel checkout
                </Button>
              </div>
            </div>
          ) : null}
        </section>

        <aside className="flex h-fit flex-col gap-3 rounded-xl border p-4">
          <h2 className="text-sm font-medium">Order summary</h2>

          <ul className="flex flex-col gap-2 text-sm">
            {session.items.map((item) => (
              <li key={item.product_id} className="flex justify-between gap-3">
                <span className="min-w-0">
                  <span className="line-clamp-1">{item.product_name}</span>
                  <span className="text-xs text-muted-foreground">
                    × {item.quantity}
                    {item.price_changed ? (
                      <span className="ml-1 text-warning-on-tint">
                        price updated from {formatMoney(item.cart_price)}
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="tabular-nums">
                  {formatMoney(item.unit_price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <Separator />

          <form className="flex flex-col gap-1.5" onSubmit={(e) => void submitPromo(e)}>
            <Label htmlFor="promo">Promo code</Label>
            <div className="flex gap-2">
              <Input
                id="promo"
                value={promoInput}
                disabled={busy || !!session.promo_code}
                onChange={(event) => setPromoInput(event.target.value)}
              />
              {session.promo_code ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void submitStep(() => removePromo(session.id))}
                >
                  Remove
                </Button>
              ) : (
                <Button type="submit" variant="outline" disabled={busy}>
                  Apply
                </Button>
              )}
            </div>
            {session.promo_code ? (
              <p className="text-xs text-muted-foreground">
                Applied: <span className="font-mono">{session.promo_code}</span>
              </p>
            ) : null}
            {promoError ? (
              <p role="alert" className="text-xs text-destructive-on-tint">
                {promoError}
              </p>
            ) : null}
          </form>

          <Separator />

          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular-nums">{formatMoney(session.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd className="tabular-nums">{formatMoney(session.shipping_fee)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Tax</dt>
              <dd className="tabular-nums">{formatMoney(session.tax)}</dd>
            </div>
            {session.discount > 0 ? (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Discount</dt>
                <dd className="tabular-nums">−{formatMoney(session.discount)}</dd>
              </div>
            ) : null}
          </dl>

          <Separator />

          <dl className="flex justify-between text-sm font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatMoney(session.total)}</dd>
          </dl>
        </aside>
      </div>
    </div>
  )
}
