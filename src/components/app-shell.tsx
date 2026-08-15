import { Link, Outlet } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Monitor, Moon, ShoppingBag, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cartCountQuery } from '@/features/cart/queries'
import { useAuth } from '@/hooks/use-auth'
import { useTheme } from '@/hooks/use-theme'
import { auth } from '@/lib/auth'
import type { Theme } from '@/lib/theme'

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

function CartButton() {
  const { isAuthenticated } = useAuth()
  // Polled, and refetched on focus, so a cart changed in another tab shows up
  // here without a reload. The poll is a background call: a dead SSO session
  // fails it quietly instead of yanking the shopper to the login page.
  const count = useQuery(cartCountQuery(isAuthenticated)).data?.count ?? 0

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      aria-label={
        isAuthenticated ? `Cart, ${count} item${count === 1 ? '' : 's'}` : 'Cart'
      }
      render={<Link to="/cart" />}
    >
      <ShoppingBag className="size-4" />
      {count > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold tabular-nums text-primary-foreground">
          {count}
        </span>
      ) : null}
    </Button>
  )
}

function AccountControls() {
  const { isAuthenticated, username } = useAuth()

  if (!isAuthenticated) {
    return (
      <Button
        size="sm"
        onClick={() => auth.login(window.location.pathname + window.location.search)}
      >
        Sign in
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-[13px] text-muted-foreground sm:inline">
        {username}
      </span>
      <Button variant="outline" size="sm" onClick={() => auth.logout()}>
        Sign out
      </Button>
    </div>
  )
}

export function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4">
          <Link to="/" className="font-semibold tracking-tight">
            duynhlab
          </Link>

          <nav aria-label="Primary" className="flex items-center gap-1">
            <Link
              to="/"
              className="rounded-md px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground data-[status=active]:text-foreground"
            >
              Store
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <CartButton />
            <AccountControls />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 text-xs text-muted-foreground">
          A demo storefront for the duynhlab platform. Nothing here ships.
        </div>
      </footer>
    </div>
  )
}
