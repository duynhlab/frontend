import { apiFetch } from '@/lib/api'

/**
 * Cart reads and commands — Variant A edge paths, all private (JWT required).
 *
 * The cart is server-owned: every mutation answers with the authoritative
 * cart, and the badge count is derived from that answer rather than
 * incremented locally. Two tabs adding the same item must not drift.
 */

export interface CartItem {
  id: string
  product_id: string
  product_name: string
  product_price: number
  quantity: number
}

export interface Cart {
  id?: string
  items: Array<CartItem>
  total?: number
}

export interface CartCount {
  count: number
}

export function getCart(signal?: AbortSignal): Promise<Cart> {
  return apiFetch<Cart>('/cart/v1/private/cart', { signal })
}

/**
 * The header badge polls this. `background: true` keeps a dead SSO session
 * from yanking the shopper to the login page mid-browse — the next real
 * action re-authenticates instead.
 */
export function getCartCount(signal?: AbortSignal): Promise<CartCount> {
  return apiFetch<CartCount>('/cart/v1/private/cart/count', {
    signal,
    background: true,
  })
}

export function addToCart(input: {
  productId: string
  productName: string
  productPrice: number
  quantity: number
}): Promise<Cart> {
  return apiFetch<Cart>('/cart/v1/private/cart', {
    method: 'POST',
    body: {
      product_id: input.productId,
      product_name: input.productName,
      product_price: input.productPrice,
      quantity: input.quantity,
    },
  })
}

export function updateCartItem(itemId: string, quantity: number): Promise<Cart> {
  return apiFetch<Cart>(
    `/cart/v1/private/cart/items/${encodeURIComponent(itemId)}`,
    { method: 'PATCH', body: { quantity } },
  )
}

export function removeCartItem(itemId: string): Promise<Cart> {
  return apiFetch<Cart>(
    `/cart/v1/private/cart/items/${encodeURIComponent(itemId)}`,
    { method: 'DELETE' },
  )
}

/** Total units in the cart — what the badge shows. */
export function countUnits(cart: Cart | undefined): number {
  return (cart?.items ?? []).reduce((sum, item) => sum + item.quantity, 0)
}
