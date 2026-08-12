import { useState, useEffect, useCallback } from 'react';
import {
    isAuthenticated as kcIsAuthenticated,
    getToken,
    getUser,
    logout as kcLogout,
} from '../auth/keycloak';

/**
 * useAuth Hook
 * Centralized authentication state, backed by the Keycloak singleton
 * (src/auth/keycloak.js). The adapter's onAuthSuccess/onAuthLogout/
 * onAuthRefreshSuccess events are fanned out as the `auth-change` window
 * event, which this hook subscribes to.
 *
 * Usage:
 *   const { isAuthenticated, user, token, logout, requireAuth } = useAuth();
 *
 *   // Guard a page
 *   useEffect(() => {
 *     requireAuth(navigate, '/checkout');
 *   }, [requireAuth, navigate]);
 *
 * `user.id` is the Keycloak subject (`sub`) — an OPAQUE STRING, never numeric.
 */
function readAuthState() {
    return {
        isAuthenticated: kcIsAuthenticated(),
        user: getUser(),
        token: getToken(),
    };
}

export function useAuth() {
    const [authState, setAuthState] = useState(readAuthState);

    // Re-read adapter state on every auth event (login, logout, refresh).
    useEffect(() => {
        const handleAuthChange = () => setAuthState(readAuthState());
        window.addEventListener('auth-change', handleAuthChange);
        return () => window.removeEventListener('auth-change', handleAuthChange);
    }, []);

    // Logout: end the Keycloak session and land back on the SPA origin.
    const logout = useCallback(() => {
        kcLogout();
    }, []);

    // Refresh auth state from the adapter (kept for API compatibility).
    const refreshAuth = useCallback(() => {
        setAuthState(readAuthState());
    }, []);

    /**
     * Require authentication - redirects to login if not authenticated
     * @param {function} navigate - react-router navigate function
     * @param {string} returnTo - URL to return to after login (optional)
     * @returns {boolean} - true if authenticated, false if redirecting
     */
    const requireAuth = useCallback((navigate, returnTo = null) => {
        if (!authState.isAuthenticated) {
            const loginUrl = returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : '/login';
            navigate(loginUrl);
            return false;
        }
        return true;
    }, [authState.isAuthenticated]);

    return {
        isAuthenticated: authState.isAuthenticated,
        user: authState.user,
        token: authState.token,
        logout,
        refreshAuth,
        requireAuth,
    };
}

export default useAuth;
