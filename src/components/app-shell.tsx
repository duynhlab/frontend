import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Bell, Monitor, Moon, ShoppingBag, Sun, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cartCountQuery } from '@/features/cart/queries'
import { notificationCountQuery } from '@/features/notifications/queries'
import { useAuth } from '@/hooks/use-auth'
import { useTheme } from '@/hooks/use-theme'
import { auth } from '@/lib/auth'
import type { Theme } from '@/lib/theme'
import { cn } from '@/lib/utils'

const THEMES: Array<{ value: Theme; label: string; Icon: typeof Sun }> = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
]

function ThemeToggle() {
  const [theme, setTheme] = useTheme()
  const index = THEMES.findIndex((t) => t.value === theme)
  const current = THEMES[index] ?? THEMES[2]!
  const next = THEMES[(index + 1) % THEMES.length]!

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Theme: ${current.label}. Switch to ${next.label}.`}
      onClick={() => setTheme(next.value)}
    >
      <current.Icon className="size-4" />
    </Button>
  )
}

/** A count badge that only appears when there is something to say. */
function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold tabular-nums text-primary-foreground">
      {count > 99 ? '99+' : count}
    </span>
  )
}

function NavLink({
  to,
  children,
}: {
  to: '/products' | '/orders'
  children: string
}) {
  return (
    <Link
      to={to}
      {...(to === '/orders' ? { search: { page: 1 } } : {})}
      className="rounded-md px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground data-[status=active]:text-foreground"
    >
      {children}
    </Link>
  )
}

function ShopperControls() {
  const { isAuthenticated, username } = useAuth()
  const location = useRouterState({ select: (s) => s.location })
  const cartCount = useQuery(cartCountQuery(isAuthenticated)).data?.count ?? 0
  const bellCount =
    useQuery(notificationCountQuery(isAuthenticated)).data?.count ?? 0

  return (
    <div className="flex items-center gap-1">
      <ThemeToggle />

      {isAuthenticated ? (
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications, ${bellCount} unread`}
          render={<Link to="/notifications" />}
        >
          <Bell className="size-4" />
          <CountBadge count={bellCount} />
        </Button>
      ) : null}

      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label={
          isAuthenticated
            ? `Cart, ${cartCount} item${cartCount === 1 ? '' : 's'}`
            : 'Cart'
        }
        render={<Link to="/cart" />}
      >
        <ShoppingBag className="size-4" />
        <CountBadge count={cartCount} />
      </Button>

      {isAuthenticated ? (
        <>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Profile (${username})`}
            render={<Link to="/profile" />}
          >
            <User className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="ml-1"
            onClick={() => auth.logout()}
          >
            Sign out
          </Button>
        </>
      ) : (
        <Button
          size="sm"
          className="ml-1"
          render={
            <Link
              to="/login"
              search={{ redirect: location.pathname + location.searchStr }}
            />
          }
        >
          Sign in
        </Button>
      )}
    </div>
  )
}

export function AppShell() {
  const { isAuthenticated } = useAuth()
  const cartCount = useQuery(cartCountQuery(isAuthenticated)).data?.count ?? 0

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
          {/* The wordmark goes home; the nav goes shopping. */}
          <Link to="/" className="font-semibold tracking-tight">
            duynhlab
          </Link>

          <nav aria-label="Primary" className="flex items-center gap-0.5">
            <NavLink to="/products">Products</NavLink>
            {isAuthenticated ? <NavLink to="/orders">Orders</NavLink> : null}
            {/* Checkout only appears when there is something to check out —
                an empty cart would dead-end on the funnel's CONFLICT. */}
            {isAuthenticated && cartCount > 0 ? (
              <Link
                to="/checkout"
                className="rounded-md px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground data-[status=active]:text-foreground"
              >
                Checkout
              </Link>
            ) : null}
          </nav>

          <div className={cn('ml-auto')}>
            <ShopperControls />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground">
          <p>A demo storefront for the duynhlab platform. Nothing here ships.</p>
          <p>
            Everything on screen comes from the live services — there is no mock
            data.
          </p>
        </div>
      </footer>
    </div>
  )
}
