/**
 * Central auth-token store (RFC-0009 Phase 5 — JWT only).
 *
 * - `authToken`        : the RS256 access token (short TTL). The key name is
 *   kept from the pre-JWT era so every existing `localStorage.getItem('authToken')`
 *   reader (pages, hooks, guards) keeps working unchanged.
 * - `authRefreshToken` : the opaque rotating refresh token (long TTL) used by
 *   the silent-refresh interceptor and revoked server-side on logout.
 *
 * NOTE: tokens live in localStorage, which is readable by any injected script
 * (XSS). Migrating to an httpOnly cookie issued by auth-service is a planned
 * follow-up (requires auth-service to set it and the gateway to forward).
 */

const ACCESS_KEY = 'authToken';
const REFRESH_KEY = 'authRefreshToken';
const USER_KEY = 'authUser';

export function getAccessToken() {
    return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
    return localStorage.getItem(REFRESH_KEY);
}

/**
 * notifyAuthChange pings same-tab listeners. `auth-change` is the app's custom
 * event; the synthetic `storage` dispatch also targets THIS tab's handleStorage
 * listeners (the native `storage` event only ever fires in OTHER tabs, which
 * the localStorage writes above already trigger).
 */
function notifyAuthChange() {
    window.dispatchEvent(new Event('auth-change'));
    window.dispatchEvent(new Event('storage'));
}

/**
 * setTokens persists a token pair (and optionally the user) from a
 * login/register/refresh response and notifies listeners.
 */
export function setTokens({ access_token: accessToken, refresh_token: refreshToken, user }) {
    if (accessToken) {
        localStorage.setItem(ACCESS_KEY, accessToken);
    }
    if (refreshToken) {
        localStorage.setItem(REFRESH_KEY, refreshToken);
    }
    if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    notifyAuthChange();
}

/** clearTokens drops all local auth state and notifies listeners. */
export function clearTokens() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    notifyAuthChange();
}
