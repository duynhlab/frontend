import { Link, useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { errorCopy } from '@/lib/error-copy'

/**
 * What the router shows when a route does not exist, or when rendering one
 * throws. Both used to be bare framework text with no shell around it — a dead
 * end that looks like the site is broken rather than like a wrong address.
 */

export function NotFound() {
  return (
    <div className="flex flex-col items-start gap-3 py-16">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">
        There is nothing at this address
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The link may be out of date, or the page may have moved.
      </p>
      <Button className="mt-2" render={<Link to="/" />}>
        Back to the store
      </Button>
    </div>
  )
}

export function RouteError({ error }: { error: unknown }) {
  const router = useRouter()
  return (
    <div role="alert" className="flex flex-col items-start gap-3 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">
        This page did not load
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {errorCopy(error, 'Something went wrong while rendering this page.')}
      </p>
      <div className="mt-2 flex gap-2">
        <Button onClick={() => void router.invalidate()}>Try again</Button>
        <Button variant="outline" render={<Link to="/" />}>
          Back to the store
        </Button>
      </div>
    </div>
  )
}
