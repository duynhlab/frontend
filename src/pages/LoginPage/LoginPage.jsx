import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { login, logout, isAuthenticated as kcIsAuthenticated } from '../../auth/keycloak';

/**
 * Login Page — Keycloak redirect (RFC-0022 / RFC-0024 P3).
 *
 * There is no in-app credential form: Direct Access Grants are disabled on the
 * `customer-spa` client, so authentication happens on the Keycloak login page
 * (Authorization Code + PKCE S256) and the user is redirected back here.
 * Self-registration is off in this release (deterministic demo users only).
 *
 * Supports query params:
 * - returnTo: app path to land on after Keycloak redirects back
 */
export default function LoginPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Read query params. returnTo is attacker-influenceable (query string), so
    // allow only same-app absolute paths — reject "//host", "/\host" and
    // scheme-bearing values to prevent a post-login open redirect.
    const rawReturnTo = searchParams.get('returnTo') || '/';
    const returnTo = /^\/(?![/\\])/.test(rawReturnTo) ? rawReturnTo : '/';

    const [redirecting, setRedirecting] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(kcIsAuthenticated);

    // Track login/logout done elsewhere (other tab, token refresh).
    useEffect(() => {
        const handleAuthChange = () => setIsAuthenticated(kcIsAuthenticated());
        window.addEventListener('auth-change', handleAuthChange);
        return () => window.removeEventListener('auth-change', handleAuthChange);
    }, []);

    const handleLogin = () => {
        setRedirecting(true);
        // Full-page redirect to Keycloak; on success the browser comes back to
        // the (sanitized) returnTo path on this origin.
        login({ redirectUri: window.location.origin + returnTo });
    };

    const handleLogout = () => {
        logout();
    };

    // Already authenticated - show message + CTA
    if (isAuthenticated) {
        return (
            <div className="auth-page">
                <div className="auth-form">
                    <h2>Already Logged In</h2>
                    <div className="success" style={{ marginBottom: '1rem' }}>
                        You are already logged in.
                    </div>
                    <button
                        className="primary"
                        style={{ width: '100%', marginBottom: '0.5rem' }}
                        onClick={() => navigate('/products')}
                    >
                        Go to Products
                    </button>
                    <button
                        style={{ width: '100%' }}
                        onClick={handleLogout}
                    >
                        Logout
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-form">
                <Link to="/" className="back-link">← Back</Link>
                <h2>Login</h2>
                <p className="api-label">
                    Sign-in is handled by Keycloak (OpenID Connect)
                </p>
                <p style={{ marginBottom: '1rem' }}>
                    You will be redirected to the platform sign-in page. Demo
                    account: <strong>alice</strong> / <strong>password123</strong>.
                </p>
                <button
                    type="button"
                    className="primary"
                    style={{ width: '100%' }}
                    onClick={handleLogin}
                    disabled={redirecting}
                >
                    {redirecting ? 'Redirecting…' : 'Sign in with Keycloak'}
                </button>
            </div>
        </div>
    );
}
