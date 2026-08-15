import { auth } from '@/lib/auth'

/**
 * Typed fetch wrapper for the platform edge (Envoy Gateway).
 *
 * Every call targets the gateway with the edge's Variant A path shape,
 * `/{service}/v1/{audience}/{resource...}` — the gateway is pass-through, so
 * the path this file sends is the path the service receives. Each feature's
 * `api.ts` owns its own prefix; this module only owns the origin, the token,
 * and the error shape.
 *
 * Replaces the axios instance + two interceptors. The behaviours that were
 * load-bearing there are preserved deliberately and marked below.
 */

const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? 'https://gateway.duynh.me'

const REQUEST_TIMEOUT_MS = 10_000

/**
 * Both platform error envelopes, normalised into one throwable.
 *
 * Most endpoints answer `{error: "<string>", code}`; checkout's requote 409
 * answers `{error: {code, message}, session}` and the refreshed session beside
 * the error is the whole point of that response — dropping it would strand the
 * shopper on a stale quote.
 */
export class ApiError extends Error {
  /** HTTP status. 0 means the request never reached the edge. */
  readonly status: number
  /** Stable machine-readable code (`STOCK_UNAVAILABLE`, `PROMO_EXPIRED`, …). */
  readonly code: string
  /** How long to wait before ONE paced retry. 0 when a retry is pointless. */
  readonly retryAfterMs: number
  /** Only present on checkout's requote 409: the refreshed session. */
  readonly session?: unknown

  constructor(
    status: number,
    code: string,
    message: string,
    extra: { retryAfterMs?: number; session?: unknown } = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.retryAfterMs = extra.retryAfterMs ?? 0
    this.session = extra.session
  }
}

/** Standard list envelope — `docs/api/api.md` § List pagination. */
export interface Paginated<T> {
  items: Array<T>
  page: number
  page_size: number
  total_items: number
  total_pages: number
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Query string parameters; undefined values are dropped. */
  query?: Record<string, string | number | undefined>
  /** Wire this to TanStack Query's queryFn signal so stale requests abort. */
  signal?: AbortSignal
  /** Sets the `Idempotency-Key` header (checkout confirm). */
  idempotencyKey?: string
  /**
   * Background poll (the cart and bell badges). A background call must never
   * yank the user to the Keycloak login page mid-session: it fails quietly
   * and the next foreground call re-authenticates instead.
   */
  background?: boolean
}

interface RawEnvelope {
  error?: string | { code?: string; message?: string }
  code?: string
  session?: unknown
}

function retryAfterMs(response: Response, fallback: number): number {
  const header = Number(response.headers.get('retry-after'))
  return header > 0 ? header * 1000 : fallback
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const token = await auth.getToken({ background: options.background })
  if (token === null && auth.isAuthenticated() && !options.background) {
    // getToken has started a login redirect. Park the request instead of
    // firing it uncredentialed or flashing a red error while the browser
    // navigates away.
    return new Promise<T>(() => {})
  }

  const url = new URL(API_BASE_URL + path, window.location.origin)
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }

  const headers = new Headers({ 'X-Request-ID': crypto.randomUUID() })
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')
  if (options.idempotencyKey) {
    headers.set('Idempotency-Key', options.idempotencyKey)
  }

  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  const signal = options.signal
    ? AbortSignal.any([options.signal, timeout])
    : timeout

  let response: Response
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal,
    })
  } catch (error) {
    // A caller-driven abort (component unmounted, query superseded) is not a
    // failure — let TanStack Query see it as an abort, not an error state.
    if (options.signal?.aborted) throw error
    if (timeout.aborted) {
      throw new ApiError(0, 'TIMEOUT', 'The request took too long — please try again.')
    }
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach server')
  }

  if (response.ok) {
    if (response.status === 204) return undefined as T
    return (await response.json()) as T
  }

  // 401 with a live SSO session should not happen — getToken refreshes before
  // every call. If the edge still rejects the token the session is unusable.
  if (response.status === 401 && !options.background) {
    auth.login(window.location.pathname + window.location.search)
    return new Promise<T>(() => {})
  }

  // Rate limited by the gateway. Not a real failure — the user is just going
  // too fast. Never auto-retried anywhere: retrying immediately only feeds
  // the limiter.
  if (response.status === 429) {
    const wait = retryAfterMs(response, 0)
    throw new ApiError(
      429,
      'RATE_LIMITED',
      wait > 0
        ? `You're doing that too fast — please wait ${Math.round(wait / 1000)}s and try again.`
        : "You're doing that too fast — please wait a moment and try again.",
      { retryAfterMs: wait },
    )
  }

  const envelope = (await response.json().catch(() => null)) as RawEnvelope | null
  const raw = envelope?.error

  // Temporarily unavailable — a service or its datastore is failing over and
  // answering fail-closed. Carry Retry-After so the caller can pace ONE retry
  // with jitter; blind retries here would synchronise the whole tab herd.
  const wait = response.status === 503 ? retryAfterMs(response, 2000) : 0

  if (raw && typeof raw === 'object') {
    throw new ApiError(
      response.status,
      raw.code ?? 'INTERNAL_ERROR',
      raw.message ?? 'An error occurred',
      { retryAfterMs: wait, session: envelope?.session },
    )
  }

  throw new ApiError(
    response.status,
    envelope?.code ?? 'INTERNAL_ERROR',
    raw ?? `Request failed with status ${response.status}`,
    { retryAfterMs: wait },
  )
}
