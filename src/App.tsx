import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { RouteFallback } from "@/components/common/Skeleton";
import AppLayout from "@/components/layout/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import NotFoundPage from "@/pages/NotFoundPage";

// Code splitting: Lazy load pages for better initial bundle size
const HomePage = lazy(() => import("@/pages/HomePage/HomePage"));
const ProductListPage = lazy(() => import("@/pages/ProductListPage/ProductListPage"));
const ProductDetailPage = lazy(() => import("@/pages/ProductDetailPage/ProductDetailPage"));
const CartPage = lazy(() => import("@/pages/CartPage/CartPage"));
const CheckoutFlowPage = lazy(() => import("@/pages/CheckoutPage/CheckoutFlowPage"));
const OrdersPage = lazy(() => import("@/pages/OrdersPage/OrdersPage"));
const NotificationPage = lazy(() => import("@/pages/NotificationPage/NotificationPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage/ProfilePage"));
const LoginPage = lazy(() => import("@/pages/LoginPage/LoginPage"));

/**
 * App — route table inside the shared AppLayout shell.
 */
function App() {
  return (
    <AppLayout>
      <Suspense fallback={<RouteFallback />}>
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
          {/* The retired /checkout/legacy entry still lands here on purpose. */}
          <Route path="/checkout/legacy" element={<Navigate to="/checkout" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
}

export default App;
