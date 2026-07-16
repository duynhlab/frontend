import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Link, NavLink, useNavigate, Navigate } from 'react-router-dom';
import useSWR from 'swr';
import { getCartCount } from './api/cartApi';
import { getNotificationCount } from './api/notificationApi';
import Footer from './components/common/Footer';
import { GridSkeleton } from './components/common/Skeleton';
import ProtectedRoute from './components/ProtectedRoute';
import { clearSession } from './auth/session';

// Code splitting: Lazy load pages for better initial bundle size
const HomePage = lazy(() => import('./pages/HomePage/HomePage'));
const ProductListPage = lazy(() => import('./pages/ProductListPage/ProductListPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage/ProductDetailPage'));
const CartPage = lazy(() => import('./pages/CartPage/CartPage'));
const CheckoutFlowPage = lazy(() => import('./pages/CheckoutPage/CheckoutFlowPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage/OrdersPage'));
const NotificationPage = lazy(() => import('./pages/NotificationPage/NotificationPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage/ProfilePage'));
const LoginPage = lazy(() => import('./pages/LoginPage/LoginPage'));

/**
 * App Component
 * Proper layout: Header → Main (flex:1) → Footer
 * Uses GET /cart/v1/private/cart/count and /notification/v1/private/notifications/count for badges with SWR
 */
function App() {
    const navigate = useNavigate();
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // SWR for cart count - automatic deduplication, caching, and smart revalidation
    // Only fetches when authenticated, revalidates on focus/reconnect
    const { data: cartData } = useSWR(
        isAuthenticated ? 'cart-count' : null, // Only fetch when authenticated
        () => getCartCount({ skipAuthRefresh: true }),
        {
            refreshInterval: 10000, // Poll every 10s (reduced from 5s)
            revalidateOnFocus: true, // Refresh when user returns to tab
            revalidateOnReconnect: true,
            dedupingInterval: 2000, // Dedupe requests within 2s
        }
    );

    // SWR for notification count - same pattern as cart
    const { data: notificationData } = useSWR(
        isAuthenticated ? 'notification-count' : null,
        () => getNotificationCount({ skipAuthRefresh: true }),
        {
            refreshInterval: 30000, // Poll every 30s (less frequent than cart)
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            dedupingInterval: 5000,
        }
    );

    const cartCount = cartData?.count || 0;
    const notificationCount = notificationData?.count || 0;

    const checkAuth = () => {
        const token = localStorage.getItem('authToken');
        setIsAuthenticated(!!token);
    };

    const handleLogout = async () => {
        await clearSession();
        setIsAuthenticated(false);
        navigate('/login');
    };

    useEffect(() => {
        checkAuth();
        // Listen for storage changes (e.g., login/logout in other tabs or from LoginPage)
        const handleStorage = () => checkAuth();
        window.addEventListener('storage', handleStorage);
        // Listen for custom auth-change event (same tab)
        window.addEventListener('auth-change', handleStorage);

        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('auth-change', handleStorage);
        };
    }, []);

    return (
        <div className="app">
            {/* Header */}
            <header className="header">
                <h1>
                    <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
                        🛒 Shop
                    </Link>
                </h1>
                <nav>
                    <NavLink to="/products">Products</NavLink>
                    {isAuthenticated && (
                        <>
                            <NavLink to="/cart">
                                Cart {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
                            </NavLink>
                            <NavLink to="/orders">Orders</NavLink>
                            <NavLink to="/notifications">
                                Notifications {notificationCount > 0 && <span className="notification-badge">{notificationCount}</span>}
                            </NavLink>
                            <NavLink to="/profile">Profile</NavLink>
                        </>
                    )}
                    {isAuthenticated ? (
                        <button
                            className="btn-logout"
                            onClick={handleLogout}
                        >
                            Logout
                        </button>
                    ) : (
                        <Link to="/login">Login</Link>
                    )}
                </nav>
            </header>

            {/* Main Content - flex:1 pushes footer down */}
            <main className="app-main">
                <Suspense fallback={<GridSkeleton count={8} />}>
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/products" element={<ProductListPage />} />
                        <Route path="/products/:id" element={<ProductDetailPage />} />
                        <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
                        <Route path="/checkout" element={<ProtectedRoute><CheckoutFlowPage /></ProtectedRoute>} />
                        <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
                        <Route path="/notifications" element={<ProtectedRoute><NotificationPage /></ProtectedRoute>} />
                        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                        <Route path="/login" element={<LoginPage />} />
                        {/* Unknown paths (incl. the removed /checkout/legacy) go home. */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Suspense>
            </main>

            {/* Footer - always at bottom */}
            <Footer />
        </div>
    );
}

export default App;
