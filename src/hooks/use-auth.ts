import { useSyncExternalStore } from 'react'
import { auth } from '@/lib/auth'

/**
 * Read Keycloak adapter state in React.
 *
 * The adapter is the single source of truth — nothing here mirrors the session
 * into component state, which is what kept the old SPA's several copies of
 * "am I logged in?" from ever disagreeing.
 */
export function useAuth() {
  const snapshot = useSyncExternalStore(auth.onChange, () =>
    auth.isAuthenticated() ? (auth.subject() ?? 'anonymous') : '',
  )

  return {
    isAuthenticated: snapshot !== '',
    userId: snapshot === '' ? undefined : snapshot,
    username: auth.username(),
    email: auth.email(),
  }
}
