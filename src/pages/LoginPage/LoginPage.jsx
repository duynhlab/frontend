import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { login, register } from '../../api/authApi';
import { clearSession } from '../../auth/session';
import { setTokens, isAuthenticated as hasStoredToken } from '../../auth/tokens';
import { useToast } from '../../hooks/useToast';

/**
 * Login Page - Auth APIs
 * POST /auth/v1/public/auth/login
 * POST /auth/v1/public/auth/register
 * 
 * Supports query params:
 * - returnTo: URL to redirect after successful auth (e.g. /products/1#reviews)
 * - mode: initial mode (login or register)
 */
export default function LoginPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { notify } = useToast();

    // Read query params. returnTo is attacker-influenceable (query string), so
    // allow only same-app absolute paths — reject "//host", "/\host" and
    // scheme-bearing values to prevent a post-login open redirect.
    const rawReturnTo = searchParams.get('returnTo') || '/';
    const returnTo = /^\/(?![/\\])/.test(rawReturnTo) ? rawReturnTo : '/';
    const initialMode = searchParams.get('mode') || 'login';

    const [mode, setMode] = useState(initialMode);
    const [loading, setLoading] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const [form, setForm] = useState({
        username: '',
        email: '',
        password: ''
    });

    // Check if user is already authenticated
    useEffect(() => {
        setIsAuthenticated(hasStoredToken());
    }, []);

    // Update mode when query param changes
    useEffect(() => {
        if (initialMode === 'login' || initialMode === 'register') {
            setMode(initialMode);
        }
    }, [initialMode]);

    const handleLogout = async () => {
        await clearSession();
        setIsAuthenticated(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let result;
            // DEV logs redact the token pair — the refresh token is a durable
            // credential and must not land in console buffers / screenshots.
            if (mode === 'login') {
                result = await login(form.username, form.password);
                if (import.meta.env.DEV) {
                    console.log('[API] POST /auth/login:', { ...result, access_token: '[redacted]', refresh_token: '[redacted]' });
                }
            } else {
                result = await register(form.username, form.email, form.password);
                if (import.meta.env.DEV) {
                    console.log('[API] POST /auth/register:', { ...result, access_token: '[redacted]', refresh_token: '[redacted]' });
                }
            }

            // Persist the JWT access token + rotating refresh token (and the
            // user info for review submissions etc.); notifies this tab and
            // other tabs. JWT-only — RFC-0009 Phase 5 removed the opaque token.
            setTokens(result);

            notify('success', 'Welcome back');
            navigate(returnTo);
        } catch (err) {
            notify('error', err.message || 'Invalid email or password');
            if (import.meta.env.DEV) {
                // Log only diagnostics — the raw axios error carries the request
                // body (err.config.data) which contains the plaintext password.
                console.error('[API ERROR]', err.response?.status, err.message);
            }
        } finally {
            setLoading(false);
        }
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
                <h2>{mode === 'login' ? 'Login' : 'Register'}</h2>
                <p className="api-label">
                    API: POST /auth/v1/public/auth/{mode === 'login' ? 'login' : 'register'}
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Username</label>
                        <input
                            type="text"
                            placeholder="alice"
                            value={form.username}
                            onChange={(e) => setForm({ ...form, username: e.target.value })}
                            required
                        />
                    </div>

                    {mode === 'register' && (
                        <div className="form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                placeholder="user@example.com"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                required
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            required
                        />
                    </div>

                    <button type="submit" className="primary" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Please wait...' : (mode === 'login' ? 'Login' : 'Register')}
                    </button>
                </form>

                <div className="auth-toggle">
                    {mode === 'login' ? (
                        <p>
                            No account?{' '}
                            <button onClick={() => setMode('register')}>Register</button>
                        </p>
                    ) : (
                        <p>
                            Have account?{' '}
                            <button onClick={() => setMode('login')}>Login</button>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
