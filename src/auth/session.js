import { logout as logoutApi } from '../api/authApi';

/**
 * clearSession revokes the server-side session (best-effort) and clears all
 * local auth state, notifying the current tab (auth-change) and other tabs
 * (storage). Use this for every logout path so the bearer token is actually
 * revoked server-side instead of only dropped from the client.
 *
 * NOTE: the token currently lives in localStorage, which is readable by any
 * injected script (XSS). Migrating to an httpOnly cookie issued by auth-service
 * is tracked as a follow-up (the auth service + gateway must set/forward it).
 */
export async function clearSession() {
    try {
        await logoutApi();
    } catch {
        // Best-effort: revocation may fail (token already expired, offline).
        // We still clear local state so the user is logged out client-side.
    }
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    window.dispatchEvent(new Event('auth-change'));
    window.dispatchEvent(new Event('storage'));
}

export default clearSession;
