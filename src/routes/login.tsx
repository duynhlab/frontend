import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { auth } from '@/lib/auth'

/**
 * `redirect` reaches this page through the query string, so it is
 * attacker-influenceable. Only same-app absolute paths are allowed:
 * `//host`, `/\host` and anything carrying a scheme are rejected, which is
 * what stops a crafted link turning our login into an open redirect.
 */
const SAFE_PATH = /^\/(?![/\\])/

const searchSchema = z.object({
  redirect: z
    .string()
    .refine((value) => SAFE_PATH.test(value))
    .optional()
    .catch(undefined),
})

export const Route = createFileRoute('/login')({
  validateSearch: searchSchema,
  component: LoginPage,
})

function LoginPage() {
  const { redirect } = Route.useSearch()
  const { isAuthenticated, username } = useAuth()
  const navigate = useNavigate()
  const target = redirect ?? '/'

  if (isAuthenticated) {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-start gap-4 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">
          You are signed in
        </h1>
        <p className="text-sm text-muted-foreground">
          Signed in as <span className="font-medium">{username}</span>.
        </p>
        <div className="flex gap-2">
          <Button onClick={() => void navigate({ to: target })}>Continue</Button>
          <Button variant="outline" onClick={() => auth.logout()}>
            Sign out
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col items-start gap-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="text-sm text-muted-foreground">
        Sign-in happens on the Keycloak page, not here — this app never sees
        your password. You will come back to where you left off.
      </p>
      <Button onClick={() => auth.login(target)}>Continue to sign in</Button>
      <p className="text-xs text-muted-foreground">
        Demo account: <span className="font-mono">alice</span> /{' '}
        <span className="font-mono">password123</span> — by username, not email.
        Self-registration is disabled on this realm.
      </p>
      <Link
        to="/"
        className="text-[13px] text-muted-foreground underline-offset-4 hover:underline"
      >
        Keep browsing instead
      </Link>
    </div>
  )
}
