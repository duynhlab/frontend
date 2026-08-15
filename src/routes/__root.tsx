import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import type { AuthApi } from '@/lib/auth'
import { Toaster } from '@/components/ui/toast'

export interface RouterContext {
  auth: AuthApi
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
})

function RootLayout() {
  return (
    <Toaster>
      <Outlet />
    </Toaster>
  )
}
