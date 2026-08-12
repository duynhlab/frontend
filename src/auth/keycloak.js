import Keycloak from 'keycloak-js';
import { DEMO_USER } from '../api/mock/seed';

/**
 * Keycloak singleton (RFC-0022 / RFC-0024 P3).
 *
 * Authentication is delegated to Keycloak (realm `duynhlab`, public client
 * `customer-spa`, Authorization Code + PKCE S256). Tokens live in memory inside
 * the keycloak-js adapter — the old custom localStorage + silent-refresh +
 * cross-tab-lock layer is deleted, not ported. Direct Access Grants are off:
 * there is no in-app password form; login is a redirect to the Keycloak page.
 *
 * Config mirrors the VITE_API_BASE_URL pattern (baked at build time via
 * Dockerfile ARG → VITE_* env; see src/api/config.js):
 *   - VITE_KEYCLOAK_URL       → Keycloak origin (default http://localhost:8081
 *                               for local dev; the cluster passes
 *                               https://id.duynh.me at image build time)
 *   - VITE_KEYCLOAK_REALM     → realm name (default duynhlab)
 *   - VITE_KEYCLOAK_CLIENT_ID → public client id (default customer-spa)
 */

export const getKeycloakUrl = () =>
    import.meta.env.VITE_KEYCLOAK_URL ?? 'http://localhost:8081';
export const getKeycloakRealm = () =>
    import.meta.env.VITE_KEYCLOAK_REALM ?? 'duynhlab';
export const getKeycloakClientId = () =>
    import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'customer-spa';

/**
 * Mock adapter — used when VITE_USE_MOCK=true (offline UI work) or
 * VITE_KEYCLOAK_MOCK=true (Playwright E2E without a Keycloak container).
 * It mimics the tiny slice of the keycloak-js surface this app uses:
 * login/logout simulate the IdP redirect round-trip with a full page
 * navigation, and the session is persisted in localStorage so reloads and
 * Playwright storageState behave like a real SSO session.
 */
const MOCK_AUTH =
    import.meta.env.VITE_USE_MOCK === 'true' ||
    import.meta.env.VITE_KEYCLOAK_MOCK === 'true';

const MOCK_SESSION_KEY = 'mockKeycloakSession';

function createMockAdapter() {
    const tokenParsed = {
        // Keep the mock subject aligned with the mock-store seed so reviews
        // and profile data in mock mode belong to the "logged in" user.
        sub: DEMO_USER.id,
        preferred_username: DEMO_USER.username,
        email: DEMO_USER.email,
    };
    return {
        authenticated: false,
        token: null,
        tokenParsed: null,
        async init() {
            if (localStorage.getItem(MOCK_SESSION_KEY)) {
                this.authenticated = true;
                this.token = 'mock-access-token';
                this.tokenParsed = { ...tokenParsed };
                this.onAuthSuccess?.();
            }
            return this.authenticated;
        },
        async login({ redirectUri } = {}) {
            localStorage.setItem(MOCK_SESSION_KEY, tokenParsed.preferred_username);
            window.location.assign(redirectUri || window.location.origin);
        },
        async logout({ redirectUri } = {}) {
            localStorage.removeItem(MOCK_SESSION_KEY);
            window.location.assign(redirectUri || window.location.origin);
        },
        async updateToken() {
            if (!this.authenticated) throw new Error('not authenticated');
            return false; // mock token never expires, never refreshed
        },
    };
}

const keycloak = MOCK_AUTH
    ? createMockAdapter()
    : new Keycloak({
          url: getKeycloakUrl(),
          realm: getKeycloakRealm(),
          clientId: getKeycloakClientId(),
      });

/**
 * keycloak-js event handlers are single-assignment, so the singleton owns them
 * and fans out to the app's existing `auth-change` window event (useAuth and
 * any other listener re-reads the adapter state on it).
 */
function notifyAuthChange() {
    window.dispatchEvent(new Event('auth-change'));
}

keycloak.onAuthSuccess = notifyAuthChange;
keycloak.onAuthLogout = notifyAuthChange;
keycloak.onAuthRefreshSuccess = notifyAuthChange;
keycloak.onTokenExpired = () => {
    // Proactive refresh when the 15-min access token expires while the tab is
    // idle; if the SSO session is gone too, the next API call redirects to login.
    keycloak.updateToken(30).catch(() => notifyAuthChange());
};

let initPromise = null;

/**
 * Initialize the adapter exactly once (check-sso: resume an existing SSO
 * session silently via the hidden iframe, never force a login redirect).
 * main.jsx awaits this before rendering so route guards see settled state.
 */
export function initKeycloak() {
    if (!initPromise) {
        initPromise = keycloak
            .init({
                onLoad: 'check-sso',
                pkceMethod: 'S256',
                silentCheckSsoRedirectUri:
                    window.location.origin + '/silent-check-sso.html',
            })
            .catch((error) => {
                // Keycloak unreachable or misconfigured: render logged-out
                // instead of a blank page; login attempts will surface it.
                if (import.meta.env.DEV) {
                    console.error('[keycloak] init failed:', error);
                }
                return false;
            });
    }
    return initPromise;
}

export function isAuthenticated() {
    return !!keycloak.authenticated;
}

export function getToken() {
    return keycloak.token ?? null;
}

/** Refresh the access token if it expires within `minValidity` seconds. */
export function updateToken(minValidity = 30) {
    return keycloak.updateToken(minValidity);
}

/** Redirect to the Keycloak login page (Code + PKCE; DAG is off). */
export function login(options = {}) {
    return keycloak.login(options);
}

/** End the Keycloak session and land back on the SPA origin. */
export function logout(options = {}) {
    return keycloak.logout({ redirectUri: window.location.origin, ...options });
}

/** Opaque Keycloak subject (string UUID in real realms) — the user id. */
export function getSubject() {
    return keycloak.tokenParsed?.sub ?? null;
}

export function getUsername() {
    return keycloak.tokenParsed?.preferred_username ?? null;
}

export function getEmail() {
    return keycloak.tokenParsed?.email ?? null;
}

/** Convenience shape matching the old `{ id, username, email }` user object. */
export function getUser() {
    if (!keycloak.authenticated || !keycloak.tokenParsed) return null;
    return {
        id: getSubject(),
        username: getUsername(),
        email: getEmail(),
    };
}

export default keycloak;
