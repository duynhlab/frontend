import { apiFetch, type Paginated } from '@/lib/api'

/**
 * A shopper's own orders — Variant A edge paths, all private.
 *
 * The list is deliberately thin: it carries totals and status but an EMPTY
 * items array. Lines live on `/details`, which is also where the shipment,
 * payment and saga-processing enrichments come from.
 */

export interface OrderLine {
  product_id: string
  product_name: string
  quantity: number
  price: number
  subtotal: number
}

export interface Order {
  id: string
  user_id: string
  status: string
  items: Array<OrderLine>
  subtotal: number
  shipping: number
  total: number
  created_at: string
}

export interface Shipment {
  id: number
  tracking_number: string
  carrier: string
  status: string
  estimated_delivery?: string
}

export interface PaymentBlock {
  status: string
  amount: number
  refunded?: number
  currency: string
}

export interface ProcessingBlock {
  stage: string
  last_step?: string
  updated_at?: string
}

export interface OrderDetails {
  order: Order
  /**
   * Every block below is a soft-fail enrichment. `undefined` means the read
   * degraded — which is NOT the same as "there is none", and the UI says so.
   */
  shipment?: Shipment | null
  payment?: PaymentBlock | null
  processing?: ProcessingBlock | null
  inventory?: { status: string } | null
  degraded?: Array<string>
}

export function listOrders(
  query: { page: number; page_size: number },
  signal?: AbortSignal,
): Promise<Paginated<Order>> {
  return apiFetch<Paginated<Order>>('/order/v1/private/orders', {
    query,
    signal,
  })
}

export function getOrderDetails(
  id: string,
  signal?: AbortSignal,
): Promise<OrderDetails> {
  return apiFetch<OrderDetails>(
    `/order/v1/private/orders/${encodeURIComponent(id)}/details`,
    { signal },
  )
}

/**
 * POST .../cancel — no body; the reason is fixed server-side.
 * 202 accepted · 200 idempotent replay · 409 not cancellable.
 */
export function cancelOrder(id: string): Promise<unknown> {
  return apiFetch<unknown>(
    `/order/v1/private/orders/${encodeURIComponent(id)}/cancel`,
    { method: 'POST' },
  )
}

/**
 * Status presentation across three different FSMs — order, shipment and
 * payment all use overlapping words. Colour is never the only signal: the
 * status word is always shown.
 */
export type StatusTone = 'success' | 'warning' | 'destructive' | 'muted' | 'info'

const TONES: Record<string, StatusTone> = {
  // order
  pending: 'muted',
  confirmed: 'info',
  processing: 'info',
  completed: 'success',
  cancelling: 'warning',
  cancelled: 'muted',
  failed: 'destructive',
  manual_review: 'warning',
  // shipment
  created: 'muted',
  dispatched: 'info',
  in_transit: 'info',
  delivered: 'success',
  // payment
  authorized: 'info',
  captured: 'success',
  refunded: 'muted',
  declined: 'destructive',
}

export function statusTone(status: string | undefined): StatusTone {
  if (!status) return 'muted'
  return TONES[status.toLowerCase()] ?? 'muted'
}

/** Which orders may still be cancelled from the storefront. */
export function canCancel(status: string): boolean {
  return status === 'confirmed' || status === 'completed'
}
