import axios from 'axios';
import { getApiBaseUrl } from './config';
import { isAuthenticated, updateToken, getToken, login } from '../auth/keycloak';

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

/**
 * Request interceptor — Keycloak-managed bearer token (RFC-0022/0024 P3).
 *
 * keycloak-js owns the token lifecycle: updateToken(30) refreshes the access
 * token when it expires within 30 s (a no-op otherwise), then the current
 * token is attached. If the refresh fails the SSO session is gone, so we
 * redirect to the Keycloak login page — except for `skipAuthRefresh` callers
 * (background badge polls), which must never yank the user mid-session.
 */
apiClient.interceptors.request.use(
    async (config) => {
        if (isAuthenticated()) {
            try {
                await updateToken(30);
            } catch {
                if (!config.skipAuthRefresh) {
                    login();
                    // Redirecting away — park the request forever instead of
                    // firing it without credentials or surfacing a red error.
                    return new Promise(() => {});
                }
                return Promise.reject(new Error('Session expired'));
            }
            config.headers.Authorization = `Bearer ${getToken()}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor — common error shaping.
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response) {
            const { config, response } = error;

            // 401 with a live SSO session should not happen (updateToken runs
            // pre-request); if the server still rejects the token the session
            // is unusable — send the user to the Keycloak login page. Badge
            // pollers (skipAuthRefresh) only opt out of the redirect.
            if (response.status === 401 && !config.skipAuthRefresh) {
                login();
            }

            // Rate limited by the gateway. Not a real failure — the user
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

            // Temporarily unavailable (backend fail-closed: a dependency or its
            // own datastore is failing over — checkout 0.5.1/0.6.x semantics).
            // Flag it and carry Retry-After so callers can pace ONE retry with
            // jitter; no auto-retry here, mirroring the 429 rule — blind
            // interceptor retries would synchronize the whole tab herd.
            if (response.status === 503) {
                error.isUnavailable = true;
                const retryAfter = Number(response.headers?.['retry-after']);
                error.retryAfterMs = retryAfter > 0 ? retryAfter * 1000 : 2000;
            }

            // Extract error message from response. Two envelopes exist:
            // RespondError ({error: "<string>", code}) and the checkout
            // requote 409 ({error: {code, message}, session}) — never assign
            // an object to error.message (it renders "[object Object]").
            const raw = error.response.data?.error;
            if (raw && typeof raw === 'object') {
                error.message = raw.message || 'An error occurred';
                error.apiError = raw;
            } else {
                error.message = raw || 'An error occurred';
            }
        } else if (error.request) {
            // Network error
            error.message = 'Network error. Please check your connection.';
        }

        return Promise.reject(error);
    }
);

export default apiClient;
