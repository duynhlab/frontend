import { apiFetch } from '@/lib/api'

/**
 * The RFC-0015 checkout session funnel — all private, JWT required.
 *
 * Edge paths nest under the literal `checkout` segment (naming v3.0.1):
 * `/checkout/v1/private/checkout/sessions[…]`. Unlike the cart, every call
 * here answers with the whole session, which is why the UI can treat the
 * response as the new truth rather than re-reading.
 */

export type SessionStatus =
  | 'open'
  | 'address_set'
  | 'shipping_set'
  | 'ready'
  | 'completed'
  | 'cancelled'
  | 'expired'

export interface SessionItem {
  product_id: string
  product_name: string
  quantity: number
  /** Current catalog price — what you will be charged. */
  unit_price: number
  /** The price when the item was carted. */
  cart_price: number
  price_changed: boolean
}

export interface Address {
  full_name: string
  line1: string
  line2: string
  city: string
  region: string
  post_code: string
  country: string
}

export interface CheckoutSession {
  id: string
  user_id: string
  status: SessionStatus
  items: Array<SessionItem>
  subtotal: number
  shipping_fee: number
  tax: number
  discount: number
  total: number
  currency: string
  expires_at: string
  address?: Address
  shipping_method?: string
  promo_code?: string
  order_id?: string
}

const BASE = '/checkout/v1/private/checkout/sessions'

export function createSession(): Promise<CheckoutSession> {
  return apiFetch<CheckoutSession>(BASE, { method: 'POST' })
}

export function setAddress(
  id: string,
  address: Address,
): Promise<CheckoutSession> {
  return apiFetch<CheckoutSession>(`${BASE}/${id}/address`, {
    method: 'PUT',
    body: address,
  })
}

export function setShipping(
  id: string,
  shippingMethod: string,
): Promise<CheckoutSession> {
  return apiFetch<CheckoutSession>(`${BASE}/${id}/shipping`, {
    method: 'PUT',
    body: { shipping_method: shippingMethod },
  })
}

export function setPayment(
  id: string,
  paymentMethodToken: string,
): Promise<CheckoutSession> {
  return apiFetch<CheckoutSession>(`${BASE}/${id}/payment`, {
    method: 'PUT',
    body: { payment_method_token: paymentMethodToken },
  })
}

export function confirmSession(
  id: string,
  idempotencyKey: string,
): Promise<CheckoutSession> {
  return apiFetch<CheckoutSession>(`${BASE}/${id}/confirm`, {
    method: 'POST',
    idempotencyKey,
  })
}

export function applyPromo(id: string, code: string): Promise<CheckoutSession> {
  return apiFetch<CheckoutSession>(`${BASE}/${id}/promo`, {
    method: 'POST',
    body: { code },
  })
}

export function removePromo(id: string): Promise<CheckoutSession> {
  return apiFetch<CheckoutSession>(`${BASE}/${id}/promo`, { method: 'DELETE' })
}

export function cancelSession(id: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`${BASE}/${id}`, { method: 'DELETE' })
}

/** Opaque test tokens. Card data never reaches this app. */
export const PAYMENT_METHODS = [
  { token: 'tok_visa', label: 'Visa test card' },
  { token: 'tok_mastercard', label: 'Mastercard test card' },
] as const

export const SHIPPING_METHODS = [
  { key: 'standard', label: 'Standard' },
  { key: 'express', label: 'Express' },
] as const

/**
 * One idempotency key per session, minted once and kept in localStorage.
 *
 * This is what makes a double-click, a reload, and a second tab converge on
 * ONE order instead of three payment attempts. It is minted lazily — on the
 * first Place-order click, not at session creation — so a shopper who
 * abandons the funnel leaves nothing behind.
 */
export function idempotencyKeyFor(sessionId: string): string {
  const storageKey = `checkoutIdemKey:${sessionId}`
  let key = localStorage.getItem(storageKey)
  if (!key) {
    key = crypto.randomUUID()
    localStorage.setItem(storageKey, key)
  }
  return key
}

/**
 * Drop the key once its session reached a terminal outcome.
 *
 * Deliberately NOT called when a confirm fails: the retry must reuse the same
 * key, which is the entire point of persisting it.
 */
export function clearIdempotencyKey(sessionId: string) {
  localStorage.removeItem(`checkoutIdemKey:${sessionId}`)
}
