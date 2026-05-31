import { Navigate, useLocation } from 'react-router-dom';

/**
 * ProtectedRoute redirects unauthenticated users to /login, preserving the
 * attempted path (+query) as returnTo so they land back where they were.
 *
 * This is a client-side UX guard only — the backend (JWT middleware on every
 * private route) remains the real enforcement point.
 */
export default function ProtectedRoute({ children }) {
    const location = useLocation();
    const token = localStorage.getItem('authToken');

    if (!token) {
        const returnTo = encodeURIComponent(location.pathname + location.search);
        return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
    }

    return children;
}
