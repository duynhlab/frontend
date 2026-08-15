import { apiFetch, type Paginated } from '@/lib/api'

/**
 * Catalog reads — all public, all Variant A edge paths
 * (`/product/v1/public/...`, gateway pass-through).
 *
 * Public reads only ever return ACTIVE products: an archived one 404s here
 * even though checkout can still price it. Same product, two answers, on
 * purpose (docs/api/product.md § status asymmetry).
 */

export interface Product {
  id: string
  name: string
  price: number
  description?: string
  category?: string
}

export type AvailabilityStatus =
  | 'in_stock'
  | 'low_stock'
  | 'out_of_stock'
  | 'unknown'

export interface Availability {
  status: AvailabilityStatus
  /** Omitted — never zeroed — when the answer is `unknown`. */
  available_to_promise?: number
}

export interface Review {
  id: string
  product_id: string
  user_id: string
  username?: string
  rating: number
  title?: string
  comment?: string
  created_at?: string
}

export interface ReviewsSummary {
  total: number
  average_rating: number
}

export interface ProductDetails {
  product: Product
  /** inventory-service's answer, soft-fail — absent if inventory is unreachable. */
  availability?: Availability
  reviews?: Array<Review>
  reviews_summary?: ReviewsSummary
  related_products?: Array<Product>
}

export interface CatalogQuery {
  page: number
  limit: number
  category?: string
  search?: string
}

/**
 * GET /product/v1/public/products
 *
 * The page-size parameter is `limit`, NOT `page_size` — product-service is the
 * one service that diverges from the shared pagination contract, and the
 * envelope echoes the effective size back as `page_size`. The old SPA sent
 * `page_size`, which the service ignored, so it asked for 24 per page and
 * silently got the service default.
 */
export function listProducts(
  query: CatalogQuery,
  signal?: AbortSignal,
): Promise<Paginated<Product>> {
  return apiFetch<Paginated<Product>>('/product/v1/public/products', {
    query: {
      page: query.page,
      limit: query.limit,
      category: query.category,
      search: query.search,
    },
    signal,
  })
}

/**
 * GET /product/v1/public/products/:id/details
 *
 * The aggregate, not four client calls: product, availability, reviews,
 * summary and related products come back composed server-side. Only the
 * product row can fail the request; every enrichment soft-fails.
 */
export function getProductDetails(
  id: string,
  signal?: AbortSignal,
): Promise<ProductDetails> {
  return apiFetch<ProductDetails>(
    `/product/v1/public/products/${encodeURIComponent(id)}/details`,
    { signal },
  )
}

/** POST /review/v1/private/reviews — one review per user per product. */
export function createReview(input: {
  productId: string
  userId: string
  rating: number
  title: string
  comment: string
}): Promise<Review> {
  return apiFetch<Review>('/review/v1/private/reviews', {
    method: 'POST',
    body: {
      product_id: input.productId,
      user_id: input.userId,
      rating: input.rating,
      title: input.title,
      comment: input.comment,
    },
  })
}

/**
 * How to present availability.
 *
 * Two rules this encodes, both learned the hard way:
 *
 *   - `unknown` must never render as in-stock or out-of-stock. Inventory
 *     soft-fails to unknown when it cannot be reached, and a page that guesses
 *     either way turns a degraded read into a claim about the order.
 *   - `purchasable` is false ONLY when we positively know the item is out of
 *     stock. Adding to a cart is not a reservation; refusing the action
 *     because a read degraded turns a lost read into a lost sale. Checkout
 *     enforces availability, fail-closed, with a retryable 503.
 */
export interface AvailabilityView {
  tone: 'success' | 'warning' | 'destructive' | 'muted'
  label: string
  purchasable: boolean
}

const AVAILABILITY: Record<
  AvailabilityStatus,
  { tone: AvailabilityView['tone']; label: string }
> = {
  in_stock: { tone: 'success', label: 'In stock' },
  low_stock: { tone: 'warning', label: 'Low stock' },
  out_of_stock: { tone: 'destructive', label: 'Out of stock' },
  unknown: { tone: 'muted', label: 'Availability unknown' },
}

export function describeAvailability(
  availability: Availability | undefined,
): AvailabilityView | null {
  if (!availability?.status) return null
  const shape = AVAILABILITY[availability.status] ?? AVAILABILITY.unknown
  const qty = availability.available_to_promise
  const showQty =
    availability.status !== 'unknown' && typeof qty === 'number' && qty > 0
  return {
    tone: shape.tone,
    label: showQty ? `${shape.label} (${qty})` : shape.label,
    purchasable: availability.status !== 'out_of_stock',
  }
}
