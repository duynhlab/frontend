import { Link, NavLink, useNavigate } from "react-router-dom";
import useSWR from "swr";
import { ShoppingCartIcon } from "lucide-react";
import { getCartCount } from "@/api/cartApi";
import { getNotificationCount } from "@/api/notificationApi";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import MobileNavigation from "./MobileNavigation";

export interface NavEntry {
  to: string;
  label: string;
  badge?: number;
}

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return cn(
    "text-sm transition-colors hover:text-foreground",
    isActive ? "font-semibold text-primary" : "text-muted-foreground",
  );
}

/**
 * AppHeader — brand, primary navigation, and the cart/notification badge
 * pollers (10s / 30s, skipAuthRefresh so a failed silent refresh never
 * hijacks navigation from a background poll).
 */
export default function AppHeader() {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  // SWR badge pollers — keys/intervals are a stable contract (network tests).
  const { data: cartData } = useSWR(
    isAuthenticated ? "cart-count" : null,
    () => getCartCount({ skipAuthRefresh: true }),
    {
      refreshInterval: 10000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    },
  );
  const { data: notificationData } = useSWR(
    isAuthenticated ? "notification-count" : null,
    () => getNotificationCount({ skipAuthRefresh: true }),
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    },
  );

  const cartCount = cartData?.count || 0;
  const notificationCount = notificationData?.count || 0;

  const handleLogout = () => {
    logout();
    void navigate("/login");
  };

  const entries: NavEntry[] = [
    { to: "/products", label: "Products" },
    ...(isAuthenticated
      ? [
          { to: "/cart", label: "Cart", badge: cartCount },
          // Funnel shortcut — only when there is something to check out.
          ...(cartCount > 0 ? [{ to: "/checkout", label: "Checkout" }] : []),
          { to: "/orders", label: "Orders" },
          { to: "/notifications", label: "Notifications", badge: notificationCount },
          { to: "/profile", label: "Profile" },
        ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 h-header border-b bg-card">
      <div className="container mx-auto flex h-full items-center justify-between gap-4 px-4">
        <h1 className="text-base font-semibold">
          <Link to="/" className="inline-flex items-center gap-1.5 text-foreground hover:no-underline">
            <ShoppingCartIcon aria-hidden="true" className="size-4 text-primary" />
            Shop
          </Link>
        </h1>

        {/* Desktop navigation */}
        <nav aria-label="Main" className="hidden items-center gap-5 md:flex">
          {entries.map((entry) => (
            <NavLink key={entry.to} to={entry.to} className={navLinkClass}>
              {entry.label}
              {entry.badge !== undefined && entry.badge > 0 && (
                <Badge className="ml-1.5 px-1.5 py-0 text-[0.6875rem]">{entry.badge}</Badge>
              )}
            </NavLink>
          ))}
          {isAuthenticated ? (
            <Button type="button" variant="ghost" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          ) : (
            <NavLink to="/login" className={navLinkClass}>
              Login
            </NavLink>
          )}
        </nav>

        {/* Mobile navigation (Sheet) */}
        <MobileNavigation
          entries={entries}
          isAuthenticated={isAuthenticated}
          onLogout={handleLogout}
        />
      </div>
    </header>
  );
}
