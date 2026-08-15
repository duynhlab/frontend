import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api'

/**
 * One QueryClient for the app, carried through router context.
 *
 * No retry on 4xx — those will not heal, and 429 in particular must never be
 * auto-retried because retrying immediately only feeds the gateway limiter.
 * One retry otherwise. Server records are never copied into client stores:
 * the cache IS the client copy.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status > 0 && error.status < 500) {
          return false
        }
        return failureCount < 1
      },
    },
    mutations: {
      // Commands are never blind-retried by the layer. Checkout retries its
      // confirm explicitly, with the same idempotency key, when the outcome
      // is unknown.
      retry: false,
    },
  },
})
