import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { NotFound, RouteError } from '@/components/route-fallbacks'
import { auth, initAuth } from '@/lib/auth'
import { queryClient } from '@/lib/query'
import { initTheme } from '@/lib/theme'
import './index.css'

const router = createRouter({
  routeTree,
  context: { auth, queryClient },
  defaultPreload: 'intent',
  // Remote data is cached by TanStack Query, not the router.
  defaultPreloadStaleTime: 0,
  // Without these two, an unknown address and a render failure both fall back
  // to bare framework text with no shell — which reads as a broken site
  // rather than a wrong link.
  defaultNotFoundComponent: NotFound,
  defaultErrorComponent: RouteError,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element #root is missing')

initTheme()

// Settle the Keycloak session (and process any login redirect) before the
// first render so route guards never see transient unauthenticated state.
void initAuth().then(() => {
  createRoot(rootElement).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
})
