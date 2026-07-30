import { logout as logoutApi } from "@/api/authApi";
import { clearTokens, getRefreshToken } from "./tokens";

/**
 * clearSession revokes the refresh-token family server-side (best-effort) and
 * clears all local auth state, notifying the current tab (auth-change) and
 * other tabs (storage). Use this for every logout path so the session is
 * actually ended server-side — the short-lived access token then simply
 * expires (JWTs are stateless).
 *
 * NOTE: tokens currently live in localStorage, which is readable by any
 * injected script (XSS). Migrating to an httpOnly cookie issued by auth-service
 * is tracked as a follow-up (the auth service + gateway must set/forward it).
 */
export async function clearSession(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    try {
      await logoutApi(refreshToken);
    } catch {
      // Best-effort: revocation may fail (family already revoked, offline).
      // We still clear local state so the user is logged out client-side.
    }
  }
  clearTokens();
}

export default clearSession;
