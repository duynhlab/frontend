import { ApiError } from '@/lib/api'

/**
 * One place that turns a failure into a sentence a shopper can act on.
 *
 * Merges what used to be three modules: the code map and friendly-message map
 * from `utils/errorMessages.js`, and the HTTP-status ladder from
 * `useToast.resolveApiErrorMessage`. Raw backend strings are never shown
 * except from the passthrough set below — those are the few that were already
 * written for end users.
 *
 * Codes are checked first on purpose: they are a stable contract, message
 * strings are not.
 */

const CODE_COPY: Record<string, string> = {
  STOCK_UNAVAILABLE:
    'Some items are no longer available — your quote was refreshed with what is in stock.',
  PRICE_CHANGED:
    'Prices changed since you carted these items — review the updated quote and confirm again.',
  PROMO_INVALID: 'That promo code does not exist.',
  PROMO_EXPIRED: 'That promo code has expired.',
  PROMO_EXHAUSTED: 'That promo code has no redemptions left.',
  IDEMPOTENCY_KEY_REQUIRED:
    'Please retry — the order request was missing its safety token.',
  INVALID_TRANSITION:
    'This step is not available for the current checkout state — refreshing the session.',
  CONFLICT: 'Your cart is empty — add items before checking out.',
  SESSION_EXPIRED: 'Your checkout session expired — starting a fresh one.',
  ORDER_NOT_CANCELLABLE:
    'This order has moved past the point where it can be cancelled.',
  SHIPMENT_ALREADY_DISPATCHED:
    'This order has already shipped, so it can no longer be cancelled.',
  RATE_LIMITED: "You're doing that too fast — please wait a moment and try again.",
  NETWORK_ERROR: 'Cannot reach server',
  TIMEOUT: 'The request took too long — please try again.',
}

/** Backend messages already written for end users — safe to show verbatim. */
const PASSTHROUGH = new Set([
  'Some items are no longer available',
  'Unknown shipping method for this destination',
  'payment_method_token must be an opaque tok_ reference',
  'Promo code not found',
])

function statusCopy(status: number): string | null {
  if (status === 400) return 'Invalid request'
  if (status === 401) return 'Please sign in again'
  if (status === 403) return 'You do not have permission'
  if (status === 404) return 'Resource not found'
  if (status === 409) return 'Conflict. Please refresh and try again'
  if (status === 422) return 'Please check your input'
  if (status >= 500) return 'Service temporarily unavailable'
  return null
}

/**
 * @param fallback shown when nothing else matched — pass something specific to
 *   the action the shopper just took.
 */
export function errorCopy(error: unknown, fallback = 'Something went wrong'): string {
  if (!(error instanceof ApiError)) return fallback

  const byCode = CODE_COPY[error.code]
  if (byCode) return byCode

  if (PASSTHROUGH.has(error.message.trim())) return error.message.trim()

  return statusCopy(error.status) ?? fallback
}
