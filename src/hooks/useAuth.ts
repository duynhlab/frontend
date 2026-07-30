import { useCallback, useEffect, useMemo, useState } from "react";
import type { NavigateFunction } from "react-router-dom";
import { clearSession } from "@/auth/session";
import { getAccessToken, getStoredUser } from "@/auth/tokens";
import type { StoredUser } from "@/api/types/auth";

/**
 * useAuth Hook
 * Centralized authentication state management
 *
 * Reads localStorage once per change through the tokens.ts helpers (single
 * source of truth for storage keys and user parsing).
 *
 * Usage:
 *   const { isAuthenticated, user, token, logout, requireAuth } = useAuth();
 *
 *   // Guard a page
 *   useEffect(() => {
 *     requireAuth(navigate, '/checkout');
 *   }, [requireAuth, navigate]);
 */
interface AuthState {
  token: string | null;
  user: StoredUser | null;
}

function readAuthState(): AuthState {
  return { token: getAccessToken(), user: getStoredUser() };
}

export function useAuth(): {
  isAuthenticated: boolean;
  user: StoredUser | null;
  token: string | null;
  logout: () => void;
  refreshAuth: () => void;
  requireAuth: (navigate: NavigateFunction, returnTo?: string | null) => boolean;
} {
  // Read localStorage once on mount, cache in state
  const [authState, setAuthState] = useState<AuthState>(readAuthState);

  const isAuthenticated = useMemo(() => !!authState.token, [authState.token]);

  // Listen for storage changes (login/logout in other tabs)
  useEffect(() => {
    const handleStorage = () => setAuthState(readAuthState());

    window.addEventListener("storage", handleStorage);
    window.addEventListener("auth-change", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("auth-change", handleStorage);
    };
  }, []);

  // Logout: revoke the server session (best-effort) and clear local state.
  const logout = useCallback(() => {
    void clearSession();
    setAuthState({ token: null, user: null });
  }, []);

  // Refresh auth state (call after login)
  const refreshAuth = useCallback(() => {
    setAuthState(readAuthState());
  }, []);

  /**
   * Require authentication - redirects to login if not authenticated.
   * Returns true if authenticated, false if redirecting.
   */
  const requireAuth = useCallback(
    (navigate: NavigateFunction, returnTo: string | null = null): boolean => {
      if (!authState.token) {
        const loginUrl = returnTo
          ? `/login?returnTo=${encodeURIComponent(returnTo)}`
          : "/login";
        void navigate(loginUrl);
        return false;
      }
      return true;
    },
    [authState.token],
  );

  return {
    isAuthenticated,
    user: authState.user,
    token: authState.token,
    logout,
    refreshAuth,
    requireAuth,
  };
}

export default useAuth;
