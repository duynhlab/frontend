import { isAxiosError } from "axios";
import type { CheckoutSession } from "@/api/types/checkout";

/**
 * Normalized application error. Every API failure is converted to this shape
 * by `toAppError` — pages and hooks never read `error.response.data.*`
 * directly, and never lose flags like `isRateLimit` to stringification.
 */
export interface AppError {
  /** User-displayable message (already passed through the friendly mapping). */
  message: string;
  /** HTTP status, when the failure came from a response. */
  status: number | undefined;
  /** Stable backend error code (e.g. PROMO_INVALID), when present. */
  code: string | undefined;
  /** Gateway rate limit (429) — show a calm hint, never a red error. */
  isRateLimit: boolean;
  /** Request never got a response (offline, DNS, CORS, timeout). */
  isNetwork: boolean;
  /** Refreshed checkout session attached to confirm-requote 409 responses. */
  session: CheckoutSession | undefined;
  /**
   * Per-field validation messages when the backend provides them (the
   * RespondError envelope today carries a single string, so this is usually
   * undefined — forms then surface the message as a root alert).
   */
  fieldErrors: Record<string, string> | undefined;
  /** Original error, for logging/debugging only. */
  cause: unknown;
}

const APP_ERROR_MARKER = Symbol.for("duynhlab.appError");

export function isAppError(value: unknown): value is AppError {
  return (
    typeof value === "object" &&
    value !== null &&
    APP_ERROR_MARKER in value
  );
}

/**
 * Message-string mapping. Never expose raw backend errors to users
 * (security + UX).
 */
const USER_FRIENDLY_MAP: Record<string, string> = {
  "Internal server error": "Something went wrong. Please try again later.",
  "Authentication required": "Please log in to continue.",
  "Invalid or expired token": "Your session has expired. Please log in again.",
  "Invalid order": "Please check your order and try again.",
  "User not found": "Profile not found.",
  "User already exists": "This account already exists.",
  "Invalid email address": "Please enter a valid email address.",
  "Unauthorized access": "You do not have permission to perform this action.",
  "Order not found": "Order not found.",
  "Network error. Please check your connection.":
    "Connection error. Please check your network and try again.",
};

/**
 * Error CODES the checkout funnel returns (stable contract — unlike message
 * strings, codes are safe to key on).
 */
const CODE_MAP: Record<string, string> = {
  STOCK_UNAVAILABLE:
    "Some items are no longer available — your quote was refreshed with what is in stock.",
  PRICE_CHANGED:
    "Prices changed since you carted these items — review the updated quote and confirm again.",
  PROMO_INVALID: "That promo code does not exist.",
  PROMO_EXPIRED: "That promo code has expired.",
  PROMO_EXHAUSTED: "That promo code has no redemptions left.",
  IDEMPOTENCY_KEY_REQUIRED:
    "Please retry — the order request was missing its safety token.",
  INVALID_TRANSITION:
    "This step is not available for the current checkout state — refreshing the session.",
  CONFLICT: "Your cart is empty — add items before checking out.",
  SESSION_EXPIRED: "Your checkout session expired — starting a fresh one.",
};

/**
 * Backend validation strings that are already written for end users — safe to
 * show verbatim instead of collapsing into the generic fallback.
 */
const PASSTHROUGH_MESSAGES = new Set([
  "Some items are no longer available",
  "Unknown shipping method for this destination",
  "payment_method_token must be an opaque tok_ reference",
  "Promo code not found",
]);

const GENERIC_MESSAGE = "Something went wrong. Please try again.";

/**
 * Returns a user-friendly error message for display in the UI. Codes are
 * checked first (stable contract); known message strings are mapped; vetted
 * backend validation strings pass through; everything else collapses to the
 * generic fallback.
 */
export function toUserFriendlyError(
  rawError: string | null | undefined,
  code?: string | null,
): string {
  if (code && CODE_MAP[code]) return CODE_MAP[code];
  if (!rawError || typeof rawError !== "string") return GENERIC_MESSAGE;
  const trimmed = rawError.trim();
  return (
    USER_FRIENDLY_MAP[trimmed] ??
    (PASSTHROUGH_MESSAGES.has(trimmed) ? trimmed : GENERIC_MESSAGE)
  );
}

interface ParsedEnvelope {
  code: string | undefined;
  message: string | undefined;
  session: CheckoutSession | undefined;
  status: number | undefined;
}

/**
 * The platform emits two error envelopes:
 *   1. httpx.RespondError (most endpoints):
 *        { "error": "<string>", "code": "<CODE>" }
 *   2. Checkout confirm-requote 409s (price/stock/promo):
 *        { "error": { "code": "<CODE>", "message": "<string>" }, "session": {…} }
 */
function parseEnvelope(error: unknown): ParsedEnvelope {
  if (!isAxiosError(error) || !error.response) {
    return {
      code: undefined,
      message: error instanceof Error ? error.message : undefined,
      session: undefined,
      status: undefined,
    };
  }
  const status = error.response.status;
  const data: unknown = error.response.data;
  if (typeof data !== "object" || data === null) {
    return { code: undefined, message: error.message, session: undefined, status };
  }
  const envelope = data as {
    error?: unknown;
    code?: unknown;
    message?: unknown;
    session?: unknown;
  };
  const raw = envelope.error;
  if (raw && typeof raw === "object") {
    const nested = raw as { code?: unknown; message?: unknown };
    return {
      code: typeof nested.code === "string" ? nested.code : undefined,
      message: typeof nested.message === "string" ? nested.message : undefined,
      session: (envelope.session as CheckoutSession | undefined) ?? undefined,
      status,
    };
  }
  return {
    code: typeof envelope.code === "string" ? envelope.code : undefined,
    message:
      typeof raw === "string"
        ? raw
        : typeof envelope.message === "string"
          ? envelope.message
          : error.message,
    session: (envelope.session as CheckoutSession | undefined) ?? undefined,
    status,
  };
}

function statusFallback(status: number | undefined): string | undefined {
  if (status === undefined) return undefined;
  if (status === 400) return "Invalid request";
  if (status === 401) return "Please sign in again";
  if (status === 403) return "You do not have permission";
  if (status === 404) return "Resource not found";
  if (status === 409) return "Conflict. Please refresh and try again";
  if (status === 422) return "Please check your input";
  if (status === 429) return "Too many requests. Please wait a moment";
  if (status >= 500) return "Service temporarily unavailable";
  return undefined;
}

/**
 * Converts any thrown value into a normalized AppError. Idempotent — passing
 * an AppError back through returns it unchanged.
 */
export function toAppError(
  error: unknown,
  fallback = "Something went wrong",
): AppError {
  if (isAppError(error)) return error;

  const parsed = parseEnvelope(error);
  const isRateLimit =
    parsed.status === 429 ||
    Boolean((error as { isRateLimit?: boolean } | null)?.isRateLimit);
  const isNetwork =
    isAxiosError(error) && !error.response && Boolean(error.request);

  let message: string;
  if (isRateLimit && error instanceof Error && error.message) {
    // The client interceptor already wrote calm Retry-After copy here.
    message = error.message;
  } else if (parsed.code) {
    message = toUserFriendlyError(parsed.message ?? null, parsed.code);
  } else if (isNetwork) {
    message = "Cannot reach server";
  } else {
    message =
      statusFallback(parsed.status) ??
      parsed.message ??
      (error instanceof Error && error.message ? error.message : fallback);
  }

  const appError: AppError = {
    message,
    status: parsed.status,
    code: parsed.code,
    isRateLimit,
    isNetwork,
    session: parsed.session,
    fieldErrors: undefined,
    cause: error,
  };
  Object.defineProperty(appError, APP_ERROR_MARKER, { value: true });
  return appError;
}
