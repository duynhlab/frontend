import Keycloak from 'keycloak-js'

/**
 * Keycloak singleton (RFC-0022 / RFC-0024 P3, ported to TypeScript by
 * RFC-0025 with the mock adapter removed).
 *
 * Authentication is delegated to Keycloak — the CUSTOMER realm `duynhlab`,
 * public client `customer-spa`, Authorization Code + PKCE S256. Tokens live
 * in memory inside the keycloak-js adapter: never web storage, never logged.
 * Direct Access Grants are off, so there is no in-app password form — login
 * is a redirect to the Keycloak page.
 *
 * Config mirrors the platform's VITE_* conditional-bake pattern:
 *   VITE_KEYCLOAK_URL       → Keycloak origin (default http://localhost:8081)
 *   VITE_KEYCLOAK_REALM     → realm name (default duynhlab)
 *   VITE_KEYCLOAK_CLIENT_ID → public client id (default customer-spa)
 */

const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL ?? 'http://localhost:8081',
  realm: import.meta.env.VITE_KEYCLOAK_REALM ?? 'duynhlab',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'customer-spa',
})

/**
 * keycloak-js event handlers are single-assignment; the singleton owns them
 * and fans out to a window event so React state can re-read adapter state.
 */
function notifyAuthChange() {
  window.dispatchEvent(new Event('auth-change'))
}

keycloak.onAuthSuccess = notifyAuthChange
keycloak.onAuthLogout = notifyAuthChange
keycloak.onAuthRefreshSuccess = notifyAuthChange
keycloak.onTokenExpired = () => {
  // Proactive refresh when the 15-min access token expires while the tab is
  // idle; if the SSO session is gone too, the next API call re-authenticates.
  keycloak.updateToken(30).catch(() => notifyAuthChange())
}

let initPromise: Promise<boolean> | null = null

/**
 * Initialize the adapter exactly once (check-sso: resume an existing SSO
 * session silently via the hidden iframe, never force a login redirect).
 * main.tsx awaits this before rendering so route guards see settled state.
 */
export function initAuth(): Promise<boolean> {
  initPromise ??= keycloak
    .init({
      onLoad: 'check-sso',
      pkceMethod: 'S256',
      silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
    })
    .catch((error: unknown) => {
      // Keycloak unreachable or misconfigured: render logged-out instead of a
      // blank page; a login attempt will surface the failure.
      if (import.meta.env.DEV) {
        console.error('[keycloak] init failed:', error)
      }
      return false
    })
  return initPromise
}

export const auth = {
  isAuthenticated: () => !!keycloak.authenticated,

  /** Opaque Keycloak subject — the user id every service keys on. */
  subject: (): string | undefined => keycloak.tokenParsed?.sub,

  username: (): string | undefined =>
    keycloak.tokenParsed?.['preferred_username'] as string | undefined,

  email: (): string | undefined =>
    keycloak.tokenParsed?.['email'] as string | undefined,

  /** Redirect to the Keycloak login page, returning to `redirectPath`. */
  login: (redirectPath = '/') =>
    keycloak.login({ redirectUri: window.location.origin + redirectPath }),

  logout: () => keycloak.logout({ redirectUri: window.location.origin }),

  /**
   * The single controlled re-auth path: refresh when <30s validity remains.
   *
   * A dead SSO session falls back to a login redirect and returns null, with
   * one exception — `background: true` (the cart and bell badge polls) fails
   * quietly instead. A poll must never navigate the user away mid-session.
   */
  getToken: async (
    { background = false }: { background?: boolean } = {},
  ): Promise<string | null> => {
    if (!keycloak.authenticated) return null
    try {
      await keycloak.updateToken(30)
    } catch {
      if (!background) await keycloak.login({ redirectUri: window.location.href })
      return null
    }
    return keycloak.token ?? null
  },

  /** Subscribe to adapter state changes; returns the unsubscribe function. */
  onChange: (listener: () => void): (() => void) => {
    window.addEventListener('auth-change', listener)
    return () => window.removeEventListener('auth-change', listener)
  },
}

export type AuthApi = typeof auth
