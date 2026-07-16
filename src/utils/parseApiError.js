/**
 * Normalizes the two backend error envelopes into one shape.
 *
 * The platform emits:
 *   1. httpx.RespondError (most endpoints):
 *        { "error": "<string>", "code": "<CODE>" }
 *   2. Checkout confirm-requote 409s (price/stock/promo):
 *        { "error": { "code": "<CODE>", "message": "<string>" }, "session": {…} }
 *
 * Callers get a stable { code, message, session, isRateLimit, status } and
 * never have to know which envelope the server used.
 * TODO: adopt across the other pages (they still read err.response.data ad hoc).
 */
export function parseApiError(err) {
    const status = err?.response?.status ?? null;
    const data = err?.response?.data;
    const raw = data?.error;

    if (raw && typeof raw === 'object') {
        return {
            code: raw.code ?? null,
            message: raw.message ?? null,
            session: data.session ?? null,
            isRateLimit: !!err?.isRateLimit,
            status,
        };
    }
    return {
        code: data?.code ?? null,
        message: typeof raw === 'string' ? raw : (data?.message ?? err?.message ?? null),
        session: data?.session ?? null,
        isRateLimit: !!err?.isRateLimit,
        status,
    };
}
