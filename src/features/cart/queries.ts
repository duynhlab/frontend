import { queryOptions } from '@tanstack/react-query'
import { getCart, getCartCount } from '@/features/cart/api'

export const cartKeys = {
  cart: ['cart'] as const,
  count: ['cart', 'count'] as const,
}

export function cartQuery() {
  return queryOptions({
    queryKey: cartKeys.cart,
    queryFn: ({ signal }) => getCart(signal),
  })
}

/**
 * The header badge. Polled on a short interval and on focus so a cart changed
 * in another tab shows up here without a reload.
 */
export function cartCountQuery(enabled: boolean) {
  return queryOptions({
    queryKey: cartKeys.count,
    queryFn: ({ signal }) => getCartCount(signal),
    enabled,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  })
}
