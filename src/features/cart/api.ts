import { apiFetch } from '@/lib/api'

/**
 * Cart reads and commands — Variant A edge paths, all private (JWT required).
 *
 * The cart is server-owned. Note what the writes do NOT return: all three
 * answer `{"message": "..."}`, not the updated cart. So a caller must re-read
 * the cart after a write and derive the badge from THAT — writing the response
 * straight into the cache silently empties the page.
 */

export interface CartItem {
  id: string
  product_id: string
  product_name: string
  product_price: number
  quantity: number
  subtotal: number
}

export interface Cart {
  user_id: string
  items: Array<CartItem>
  subtotal: number
  shipping: number
  total: number
  /** Distinct lines, not units — the badge counts units (see getCartCount). */
  item_count: number
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

/** Acknowledgement only — re-read the cart to see the result. */
interface CartAck {
  message: string
}

export function addToCart(input: {
  productId: string
  productName: string
  productPrice: number
  quantity: number
}): Promise<CartAck> {
  return apiFetch<CartAck>('/cart/v1/private/cart', {
    method: 'POST',
    body: {
      product_id: input.productId,
      product_name: input.productName,
      product_price: input.productPrice,
      quantity: input.quantity,
    },
  })
}

export function updateCartItem(
  itemId: string,
  quantity: number,
): Promise<CartAck> {
  return apiFetch<CartAck>(
    `/cart/v1/private/cart/items/${encodeURIComponent(itemId)}`,
    { method: 'PATCH', body: { quantity } },
  )
}

export function removeCartItem(itemId: string): Promise<CartAck> {
  return apiFetch<CartAck>(
    `/cart/v1/private/cart/items/${encodeURIComponent(itemId)}`,
    { method: 'DELETE' },
  )
}

/** Total units in the cart — what the badge shows. */
export function countUnits(cart: Cart | undefined): number {
  return (cart?.items ?? []).reduce((sum, item) => sum + item.quantity, 0)
}
