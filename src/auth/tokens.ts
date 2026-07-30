/**
 * Central auth-token store (RFC-0009 Phase 5 — JWT only).
 *
 * - `authToken`        : the RS256 access token (short TTL). The key name is
 *   kept from the pre-JWT era so existing readers keep working unchanged.
 * - `authRefreshToken` : the opaque rotating refresh token (long TTL) used by
 *   the silent-refresh interceptor and revoked server-side on logout.
 * - `authUser`         : JSON-serialized user identity for display purposes.
 *
 * ALWAYS read auth state through these helpers — never via raw
 * `localStorage.getItem` in components (AGENTS.md).
 *
 * NOTE: tokens live in localStorage, which is readable by any injected script
 * (XSS). Migrating to an httpOnly cookie issued by auth-service is a planned
 * follow-up (requires auth-service to set it and the gateway to forward).
 */
import type { StoredUser } from "@/api/types/auth";

const ACCESS_KEY = "authToken";
const REFRESH_KEY = "authRefreshToken";
const USER_KEY = "authUser";

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

/** Parses the stored user identity; null when absent or corrupted. */
export function getStoredUser(): StoredUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as StoredUser).id === "string" &&
      typeof (parsed as StoredUser).username === "string"
    ) {
      return parsed as StoredUser;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * UX-only auth check (the backend's JWT middleware is the real enforcement).
 */
export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}

/**
 * notifyAuthChange pings same-tab listeners. `auth-change` is the app's custom
 * event; the synthetic `storage` dispatch also targets THIS tab's handleStorage
 * listeners (the native `storage` event only ever fires in OTHER tabs, which
 * the localStorage writes above already trigger).
 */
function notifyAuthChange(): void {
  window.dispatchEvent(new Event("auth-change"));
  window.dispatchEvent(new Event("storage"));
}

/**
 * setTokens persists a token pair (and optionally the user) from a
 * login/register/refresh response and notifies listeners.
 */
export function setTokens({
  access_token: accessToken,
  refresh_token: refreshToken,
  user,
}: {
  access_token?: string;
  refresh_token?: string;
  user?: StoredUser;
}): void {
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
export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  notifyAuthChange();
}
