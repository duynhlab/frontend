import axios from 'axios';
import { getApiBaseUrl } from './config';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../auth/tokens';

/**
 * Axios instance configured for backend API
 * Base URL from environment variables (build-time or runtime)
 */
const apiClient = axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - Add the RS256 access token if available.
// NOTE: the token is read from localStorage, which is exposed to any injected
// script (XSS). Migrating to an httpOnly cookie issued by auth-service is a
// planned follow-up (requires auth-service to set it and the gateway to forward).
apiClient.interceptors.request.use(
    (config) => {
        const token = getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

/**
 * Silent refresh.
 *
 * The access token is a short-lived JWT; when a request 401s we rotate the
 * refresh token via POST /auth/v1/public/refresh, store the new pair, and retry
 * the original request once. Concurrency is guarded at two levels, because the
 * server's reuse-detection revokes the WHOLE token family if the same refresh
 * token is presented twice:
 *
 *  - in-tab: a single shared promise (refreshInFlight) so a burst of 401s
 *    triggers exactly one refresh;
 *  - cross-tab: a Web Lock ('auth-refresh') serialises tabs, and after
 *    acquiring the lock we re-check localStorage — if another tab already
 *    rotated while we waited, we reuse its fresh access token instead of
 *    replaying the rotated refresh token.
 *
 * The refresh call itself uses a bare axios instance: going through apiClient
 * would re-enter these interceptors and recurse.
 */
let refreshInFlight = null;

async function doRefresh(staleAccessToken) {
    // Another tab may have refreshed while we waited on the lock: the stored
    // access token would differ from the one that just 401ed.
    const current = getAccessToken();
    if (current && current !== staleAccessToken) {
        return current;
    }
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
        throw new Error('no refresh token');
    }
    const { data } = await axios.post(
        `${getApiBaseUrl()}/auth/v1/public/refresh`,
        { refresh_token: refreshToken },
        { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
    );
    if (!data?.access_token || !data?.refresh_token) {
        // A malformed 200 must fail loudly — silently keeping the stale pair
        // would retry with "Bearer undefined".
        throw new Error('malformed refresh response');
    }
    setTokens(data);
    return data.access_token;
}

function refreshTokens(staleAccessToken) {
    if (!refreshInFlight) {
        const run = () =>
            navigator.locks?.request
                ? navigator.locks.request('auth-refresh', () => doRefresh(staleAccessToken))
                : doRefresh(staleAccessToken); // very old browsers: in-tab guard only
        refreshInFlight = run().finally(() => {
            refreshInFlight = null;
        });
    }
    return refreshInFlight;
}

/** redirectToLogin clears local auth state and sends the user to /login. */
function redirectToLogin() {
    // Always drop dead tokens — even on /login itself, where stale state would
    // otherwise show "Already Logged In".
    clearTokens();
    if (window.location.pathname.includes('/login')) {
        return;
    }
    // Preserve where the user was so login can send them back.
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?returnTo=${returnTo}`;
}

// Response interceptor - silent refresh on 401, then common error shaping.
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response) {
            const { config, response } = error;
            const isAuthPublic = (config?.url || '').includes('/auth/v1/public/');

            // 401 on a normal API call: one silent refresh + retry. Never for
            // the auth public endpoints themselves (login/refresh/logout) or an
            // already-retried request. skipAuthRefresh callers (background
            // badge polls) still refresh — they only opt out of the REDIRECT,
            // otherwise an idle tab's polls would 401 forever once the access
            // token expires.
            if (
                response.status === 401 &&
                !config._retried &&
                !isAuthPublic &&
                getRefreshToken()
            ) {
                config._retried = true;
                try {
                    const accessToken = await refreshTokens(getAccessToken());
                    config.headers.Authorization = `Bearer ${accessToken}`;
                    return apiClient(config);
                } catch {
                    if (!config.skipAuthRefresh) {
                        redirectToLogin();
                    }
                }
            } else if (response.status === 401 && !config.skipAuthRefresh && !isAuthPublic) {
                // No refresh possible (no token / retry exhausted): log out.
                // isAuthPublic is excluded so a wrong password on login (401
                // from /auth/v1/public/login) doesn't clear state or redirect.
                redirectToLogin();
            }

            // Rate limited by the gateway (Kong). Not a real failure — the user
            // is just going too fast (e.g. clicking several actions in a burst).
            // Flag it so callers can show a calm "slow down" hint instead of a
            // red error, and surface Retry-After when the gateway sends it. No
            // auto-retry here: retrying immediately only feeds the limiter.
            if (response.status === 429) {
                error.isRateLimit = true;
                const retryAfter = Number(response.headers?.['retry-after']);
                error.message = retryAfter > 0
                    ? `You're doing that too fast — please wait ${retryAfter}s and try again.`
                    : "You're doing that too fast — please wait a moment and try again.";
                return Promise.reject(error);
            }

            // Extract error message from response
            const message = error.response.data?.error || 'An error occurred';
            error.message = message;
        } else if (error.request) {
            // Network error
            error.message = 'Network error. Please check your connection.';
        }

        return Promise.reject(error);
    }
);

export default apiClient;
