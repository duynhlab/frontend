import { createRootRouteWithContext } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import type { AuthApi } from '@/lib/auth'
import { AppShell } from '@/components/app-shell'
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
      <AppShell />
    </Toaster>
  )
}
