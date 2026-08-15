import { useEffect, useRef, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Minus, Plus } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/ui/toast'
import { ProductTile } from '@/components/product-tile'
import { StarRating } from '@/components/star-rating'
import { EmptyState, ErrorState, LineSkeleton } from '@/components/states'
import { describeAvailability, type Review } from '@/features/catalog/api'
import { createReview } from '@/features/catalog/api'
import { catalogKeys, productDetailsQuery } from '@/features/catalog/queries'
import { addToCart } from '@/features/cart/api'
import { cartKeys } from '@/features/cart/queries'
import { useAuth } from '@/hooks/use-auth'
import { ApiError } from '@/lib/api'
import { auth } from '@/lib/auth'
import { errorCopy } from '@/lib/error-copy'
import { formatDate, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/products_/$productId')({
  component: ProductDetail,
})

const TONE_CLASS = {
  success: 'bg-success/10 text-success-on-tint',
  warning: 'bg-warning/10 text-warning-on-tint',
  destructive: 'bg-destructive/10 text-destructive-on-tint',
  muted: 'bg-muted text-muted-foreground',
} as const

function QuantityStepper({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (next: number) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="outline"
        size="icon"
        aria-label="Decrease quantity"
        disabled={disabled || value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <Minus className="size-4" />
      </Button>
      {/* role="status" both announces the change politely and makes the
          aria-label legal — on a roleless span the label is prohibited, and
          the bare digit would announce as "1" with no idea what of. */}
      <span
        role="status"
        aria-label={`Quantity ${value}`}
        className="w-8 text-center text-sm tabular-nums"
      >
        {value}
      </span>
      <Button
        variant="outline"
        size="icon"
        aria-label="Increase quantity"
        disabled={disabled}
        onClick={() => onChange(value + 1)}
      >
        <Plus className="size-4" />
      </Button>
    </div>
  )
}

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().min(1, 'Give your review a title').max(120),
  comment: z.string().min(1, 'Say a little about the product').max(2000),
})

function ReviewForm({ productId, userId }: { productId: string; userId: string }) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (value: z.infer<typeof reviewSchema>) =>
      createReview({ productId, userId, ...value }),
    onSuccess: () => {
      toast.add({ title: 'Review posted', type: 'success' })
      void queryClient.invalidateQueries({
        queryKey: catalogKeys.details(productId),
      })
    },
    onError: (error) => {
      // A 409 means this account already reviewed the product — the form was
      // simply looking at a stale list. Say so calmly and refresh, so the
      // form disappears instead of inviting a retry that cannot succeed.
      const duplicate =
        error instanceof ApiError &&
        (error.status === 409 || error.message.toLowerCase().includes('already exists'))
      if (duplicate) {
        toast.add({ title: 'You have already reviewed this product', type: 'info' })
        void queryClient.invalidateQueries({
          queryKey: catalogKeys.details(productId),
        })
        return
      }
      toast.add({
        title: errorCopy(error, 'The review could not be posted.'),
        type: 'error',
      })
    },
  })

  const form = useForm({
    defaultValues: { rating: 5, title: '', comment: '' },
    validators: { onSubmit: reviewSchema },
    onSubmit: ({ value }) => mutation.mutate(value),
  })

  return (
    <form
      className="flex flex-col gap-4 rounded-xl border p-4"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <p className="text-sm font-medium">Write a review</p>

      <form.Field name="rating">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="review-rating">Rating</Label>
            <select
              id="review-rating"
              className="h-9 w-32 rounded-md border bg-transparent px-2.5 text-sm"
              value={field.state.value}
              onChange={(event) => field.handleChange(Number(event.target.value))}
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} star{n === 1 ? '' : 's'}
                </option>
              ))}
            </select>
          </div>
        )}
      </form.Field>

      <form.Field name="title">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="review-title">Title</Label>
            <Input
              id="review-title"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
            />
            {field.state.meta.errors.map((err, i) => (
              <p key={i} className="text-xs text-destructive-on-tint">
                {(err as { message?: string } | null)?.message ?? 'Invalid value'}
              </p>
            ))}
          </div>
        )}
      </form.Field>

      <form.Field name="comment">
        {(field) => (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="review-comment">Your review</Label>
            <textarea
              id="review-comment"
              rows={4}
              className="rounded-md border bg-transparent px-3 py-2 text-sm"
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
            />
            {field.state.meta.errors.map((err, i) => (
              <p key={i} className="text-xs text-destructive-on-tint">
                {(err as { message?: string } | null)?.message ?? 'Invalid value'}
              </p>
            ))}
          </div>
        )}
      </form.Field>

      <Button type="submit" className="self-start" disabled={mutation.isPending}>
        {mutation.isPending ? 'Posting…' : 'Post review'}
      </Button>
    </form>
  )
}

function ReviewCard({ review, mine }: { review: Review; mine: boolean }) {
  return (
    <li className="flex flex-col gap-1.5 border-b pb-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <StarRating value={review.rating} />
        <span className="text-sm font-medium">{review.title}</span>
      </div>
      <p className="text-sm text-muted-foreground">{review.comment}</p>
      <p className="text-xs text-muted-foreground">
        {/* Reviews carry no author name — review-service returns only the
            opaque user id — so claiming a username here would be an invention. */}
        {mine ? 'You' : 'Verified customer'} · {formatDate(review.created_at)}
      </p>
    </li>
  )
}

function ProductDetail() {
  const { productId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isAuthenticated, userId } = useAuth()
  const [quantity, setQuantity] = useState(1)

  const query = useQuery(productDetailsQuery(productId))
  const details = query.data

  const reviewsRef = useRef<HTMLElement>(null)
  useEffect(() => {
    // Deep links land on #reviews — the shopper followed "12 reviews" from
    // somewhere, or came back from signing in to write one.
    if (window.location.hash === '#reviews' && details) {
      reviewsRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [details])

  const addMutation = useMutation({
    mutationFn: () =>
      addToCart({
        productId,
        productName: details!.product.name,
        productPrice: details!.product.price,
        quantity,
      }),
    onSuccess: () => {
      toast.add({ title: 'Added to cart', type: 'success' })
      setQuantity(1)
      // Move the badge immediately, then let the authoritative cart settle it.
      queryClient.setQueryData<{ count: number }>(cartKeys.count, (prev) => ({
        count: (prev?.count ?? 0) + quantity,
      }))
      void queryClient.invalidateQueries({ queryKey: cartKeys.cart })
      void queryClient.invalidateQueries({ queryKey: cartKeys.count })
    },
    onError: (error) =>
      toast.add({
        title: errorCopy(error, 'The item could not be added to your cart.'),
        type: 'error',
      }),
  })

  if (query.isPending) {
    return (
      <div className="grid gap-8 md:grid-cols-2">
        <div className="aspect-square rounded-xl bg-muted" />
        <LineSkeleton rows={6} />
      </div>
    )
  }

  if (query.isError) {
    const missing = query.error instanceof ApiError && query.error.status === 404
    return missing ? (
      <EmptyState
        title="This product is not available"
        description="It may have been withdrawn from the catalog."
        action={
          <Button variant="outline" size="sm" render={<Link to="/" search={{ page: 1 }} />}>
            Back to the store
          </Button>
        }
      />
    ) : (
      <ErrorState
        error={query.error}
        fallback="This product could not be loaded."
        onRetry={() => void query.refetch()}
      />
    )
  }

  const product = details!.product
  const availability = describeAvailability(details!.availability)
  const reviews = details!.reviews ?? []
  const summary = details!.reviews_summary
  const related = details!.related_products ?? []
  const hasReviewed =
    !!userId && reviews.some((r) => String(r.user_id) === String(userId))

  return (
    <div className="flex flex-col gap-10">
      <Link
        to="/"
        search={{ page: 1 }}
        className="inline-flex w-fit items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Back to the store
      </Link>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="@container">
          <ProductTile name={product.name} />
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
            {product.category ? (
              <Link
                to="/"
                search={{ page: 1, category: product.category }}
                className="w-fit text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {product.category}
              </Link>
            ) : null}
          </div>

          <p className="text-3xl font-semibold tabular-nums">
            {formatMoney(product.price)}
          </p>

          {availability ? (
            <span
              className={cn(
                'w-fit rounded-full px-2.5 py-1 text-xs font-medium',
                TONE_CLASS[availability.tone],
              )}
            >
              {availability.label}
            </span>
          ) : null}

          {product.description ? (
            <p className="text-sm text-muted-foreground">{product.description}</p>
          ) : null}

          <Separator className="my-2" />

          {isAuthenticated ? (
            <div className="flex flex-wrap items-center gap-3">
              <QuantityStepper
                value={quantity}
                onChange={setQuantity}
                disabled={addMutation.isPending}
              />
              <Button
                // Availability, NOT a stock count: product stopped sending its
                // frozen `stock` block in 1.8.0, and the old `!stock.available`
                // test left this button permanently disabled — no error, no
                // failed request, just nobody able to buy anything. `unknown`
                // stays purchasable on purpose; checkout enforces stock.
                disabled={addMutation.isPending || availability?.purchasable === false}
                onClick={() => addMutation.mutate()}
              >
                {addMutation.isPending ? 'Adding…' : 'Add to cart'}
              </Button>
            </div>
          ) : (
            <Button
              className="w-fit"
              onClick={() => auth.login(`/products/${productId}`)}
            >
              Sign in to buy
            </Button>
          )}
        </div>
      </div>

      <section ref={reviewsRef} id="reviews" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Reviews</h2>
          {summary && summary.total > 0 ? (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <StarRating value={summary.average_rating} />
              {summary.average_rating.toFixed(1)} · {summary.total} review
              {summary.total === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>

        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No reviews yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                mine={String(review.user_id) === String(userId)}
              />
            ))}
          </ul>
        )}

        {!isAuthenticated ? (
          <Button
            variant="outline"
            className="w-fit"
            onClick={() => auth.login(`/products/${productId}#reviews`)}
          >
            Sign in to write a review
          </Button>
        ) : hasReviewed ? (
          <p className="text-sm text-muted-foreground">
            You have already reviewed this product.
          </p>
        ) : userId ? (
          <ReviewForm productId={productId} userId={userId} />
        ) : null}
      </section>

      {related.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold tracking-tight">Related products</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((item) => (
              <button
                key={item.id}
                type="button"
                className="flex flex-col gap-2 rounded-xl text-left outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
                onClick={() =>
                  void navigate({
                    to: '/products/$productId',
                    params: { productId: item.id },
                  })
                }
              >
                <div className="@container">
                  <ProductTile name={item.name} />
                </div>
                <span className="line-clamp-2 text-sm font-medium">{item.name}</span>
                <span className="text-sm font-semibold tabular-nums">
                  {formatMoney(item.price)}
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
