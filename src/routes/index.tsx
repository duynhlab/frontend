import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorState } from '@/components/states'
import { catalogOverviewQuery } from '@/features/catalog/queries'

export const Route = createFileRoute('/')({
  component: Home,
})

/**
 * The home page asks one question and gets out of the way.
 *
 * It shows no product rail on purpose. The platform has nothing to rank by —
 * no featured flag, no bestseller signal, no rating on a list item, and
 * `created_at` is sortable but never returned — so any "Featured" or "New in"
 * strip would be a label the data cannot support. A search box, the real
 * category buckets, and a way through to everything is what this catalog can
 * honestly offer.
 */
function Home() {
  const navigate = useNavigate()
  const query = useQuery(catalogOverviewQuery())

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-6 py-12 text-center sm:py-20">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          What are you looking for?
        </h1>
        <p className="min-h-6 text-sm text-muted-foreground">
          {query.data
            ? `${query.data.total} product${query.data.total === 1 ? '' : 's'} in the store`
            : null}
        </p>
      </div>

      <form
        role="search"
        className="flex w-full max-w-md items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const value = new FormData(event.currentTarget)
            .get('q')
            ?.toString()
            .trim()
          void navigate({
            to: '/products',
            search: value ? { q: value } : {},
          })
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            type="search"
            placeholder="Search products"
            aria-label="Search products"
            className="h-11 w-full pl-9"
          />
        </div>
        <Button type="submit" className="h-11">
          Search
        </Button>
      </form>

      {query.isError ? (
        <ErrorState
          error={query.error}
          fallback="The store could not be reached."
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {query.data && query.data.categories.length > 0 ? (
        <nav aria-label="Shop by category" className="flex flex-wrap justify-center gap-2">
          {query.data.categories.map(({ name, count }) => (
            <Link
              key={name}
              to="/products"
              // Category filtering is an exact, case-sensitive string match on
              // the server, so pass the value back exactly as it arrived.
              search={{ category: name }}
              className="rounded-full border px-3 py-1.5 text-[13px] transition-colors hover:bg-muted"
            >
              {name}{' '}
              <span className="tabular-nums text-muted-foreground">{count}</span>
            </Link>
          ))}
        </nav>
      ) : null}

      <Button variant="outline" render={<Link to="/products" />}>
        Browse all products
      </Button>
    </div>
  )
}
