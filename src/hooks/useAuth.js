import { useState, useEffect, useCallback, useMemo } from 'react';
import { clearSession } from '../auth/session';

/**
 * useAuth Hook
 * Centralized authentication state management
 * 
 * Best practice: js-cache-storage - read localStorage once per render
 * 
 * Usage:
 *   const { isAuthenticated, user, token, logout, requireAuth } = useAuth();
 *   
 *   // Guard a page
 *   useEffect(() => {
 *     requireAuth(navigate, '/checkout');
 *   }, [requireAuth, navigate]);
 */
export function useAuth() {
    // Read localStorage once on mount, cache in state
    const [authState, setAuthState] = useState(() => {
        const token = localStorage.getItem('authToken');
        let user = null;
        try {
            const stored = localStorage.getItem('authUser');
            user = stored ? JSON.parse(stored) : null;
        } catch {
            user = null;
        }
        return { token, user };
    });

    const isAuthenticated = useMemo(() => !!authState.token, [authState.token]);

    // Listen for storage changes (login/logout in other tabs)
    useEffect(() => {
        const handleStorage = () => {
            const token = localStorage.getItem('authToken');
            let user = null;
            try {
                const stored = localStorage.getItem('authUser');
                user = stored ? JSON.parse(stored) : null;
            } catch {
                user = null;
            }
            setAuthState({ token, user });
        };

        window.addEventListener('storage', handleStorage);
        window.addEventListener('auth-change', handleStorage);

        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('auth-change', handleStorage);
        };
    }, []);

    // Logout: revoke the server session (best-effort) and clear local state.
    const logout = useCallback(() => {
        clearSession();
        setAuthState({ token: null, user: null });
    }, []);

    // Refresh auth state (call after login)
    const refreshAuth = useCallback(() => {
        const token = localStorage.getItem('authToken');
        let user = null;
        try {
            const stored = localStorage.getItem('authUser');
            user = stored ? JSON.parse(stored) : null;
        } catch {
            user = null;
        }
        setAuthState({ token, user });
    }, []);

    /**
     * Require authentication - redirects to login if not authenticated
     * @param {function} navigate - react-router navigate function
     * @param {string} returnTo - URL to return to after login (optional)
     * @returns {boolean} - true if authenticated, false if redirecting
     */
    const requireAuth = useCallback((navigate, returnTo = null) => {
        if (!authState.token) {
            const loginUrl = returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : '/login';
            navigate(loginUrl);
            return false;
        }
        return true;
    }, [authState.token]);

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
