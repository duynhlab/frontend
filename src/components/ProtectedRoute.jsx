import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated } from '../auth/keycloak';

/**
 * ProtectedRoute redirects unauthenticated users to /login, preserving the
 * attempted path (+query) as returnTo so they land back where they were.
 * Keycloak init settles before render (main.jsx), so the adapter state is
 * safe to read synchronously here.
 *
 * This is a client-side UX guard only — the backend (JWT middleware on every
 * private route) remains the real enforcement point.
 */
export default function ProtectedRoute({ children }) {
    const location = useLocation();

    if (!isAuthenticated()) {
        const returnTo = encodeURIComponent(location.pathname + location.search);
        return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
    }

    return children;
}
