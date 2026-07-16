/**
 * Maps backend/API errors to user-friendly messages.
 * Never expose raw backend errors to users (security + UX).
 */

const USER_FRIENDLY_MAP = {
    'Internal server error': 'Something went wrong. Please try again later.',
    'Authentication required': 'Please log in to continue.',
    'Invalid or expired token': 'Your session has expired. Please log in again.',
    'Invalid order': 'Please check your order and try again.',
    'User not found': 'Profile not found.',
    'User already exists': 'This account already exists.',
    'Invalid email address': 'Please enter a valid email address.',
    'Unauthorized access': 'You do not have permission to perform this action.',
    'Order not found': 'Order not found.',
    'Network error. Please check your connection.': 'Connection error. Please check your network and try again.',
};

// Error CODES the checkout funnel returns (stable contract — unlike message
// strings, codes are safe to key on).
const CODE_MAP = {
    STOCK_UNAVAILABLE: 'Some items are no longer available — your quote was refreshed with what is in stock.',
    PRICE_CHANGED: 'Prices changed since you carted these items — review the updated quote and confirm again.',
    PROMO_INVALID: 'That promo code does not exist.',
    PROMO_EXPIRED: 'That promo code has expired.',
    PROMO_EXHAUSTED: 'That promo code has no redemptions left.',
    IDEMPOTENCY_KEY_REQUIRED: 'Please retry — the order request was missing its safety token.',
    INVALID_TRANSITION: 'This step is not available for the current checkout state — refreshing the session.',
    CONFLICT: 'Your cart is empty — add items before checking out.',
    SESSION_EXPIRED: 'Your checkout session expired — starting a fresh one.',
};

// Backend validation strings that are already written for end users — safe to
// show verbatim instead of collapsing into the generic fallback.
const PASSTHROUGH_MESSAGES = new Set([
    'Some items are no longer available',
    'Unknown shipping method for this destination',
    'payment_method_token must be an opaque tok_ reference',
    'Promo code not found',
]);

/**
 * Returns a user-friendly error message for display in UI.
 * Accepts an optional error CODE (checked first — codes are a stable
 * contract, message strings are not). Falls back to generic message.
 */
export function toUserFriendlyError(rawError, code) {
    if (code && CODE_MAP[code]) return CODE_MAP[code];
    if (!rawError || typeof rawError !== 'string') {
        return 'Something went wrong. Please try again.';
    }
    const trimmed = rawError.trim();
    return USER_FRIENDLY_MAP[trimmed]
        || (PASSTHROUGH_MESSAGES.has(trimmed) ? trimmed : null)
        || 'Something went wrong. Please try again.';
}
