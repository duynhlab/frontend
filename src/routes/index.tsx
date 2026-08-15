import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/pagination'
import { ProductTile } from '@/components/product-tile'
import { EmptyState, ErrorState, GridSkeleton } from '@/components/states'
import type { Product } from '@/features/catalog/api'
import { productsQuery } from '@/features/catalog/queries'
import { formatMoney } from '@/lib/format'

const PAGE_SIZE = 24

// Every field is optional with a default, so a bare `<Link to="/">` is valid
// and a hand-edited or stale URL degrades to page 1 instead of erroring.
const searchSchema = z.object({
  page: z.number().int().min(1).catch(1).default(1),
  category: z.string().optional().catch(undefined),
  q: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/')({
  validateSearch: searchSchema,
  component: Catalog,
})

function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      to="/products/$productId"
      params={{ productId: product.id }}
      className="group flex flex-col gap-2 rounded-xl outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
    >
      <div className="@container">
        <ProductTile
          name={product.name}
          className="transition-transform group-hover:-translate-y-0.5"
        />
      </div>
      <span className="line-clamp-2 text-sm font-medium">{product.name}</span>
      <span className="mt-auto text-sm font-semibold tabular-nums">
        {formatMoney(product.price)}
      </span>
    </Link>
  )
}

function Catalog() {
  const { page, category, q } = Route.useSearch()
  const navigate = useNavigate({ from: '/' })

  const query = useQuery(
    productsQuery({ page, limit: PAGE_SIZE, category, search: q }),
  )

  const goTo = (next: { category?: string; q?: string }) => {
    void navigate({ search: (prev) => ({ ...prev, page: 1, ...next }) })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Store</h1>
          {query.data ? (
            <p className="text-sm text-muted-foreground">
              {query.data.total_items} item
              {query.data.total_items === 1 ? '' : 's'}
            </p>
          ) : null}
        </div>

        <form
          role="search"
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const value = new FormData(event.currentTarget)
              .get('q')
              ?.toString()
              .trim()
            goTo({ q: value ? value : undefined })
          }}
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              key={q ?? ''}
              name="q"
              type="search"
              defaultValue={q ?? ''}
              placeholder="Search products"
              aria-label="Search products"
              className="w-56 pl-8"
            />
          </div>
          <Button type="submit" variant="outline" size="sm">
            Search
          </Button>
        </form>
      </div>

      {category || q ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-muted-foreground">Filtered by</span>
          {category ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => goTo({ category: undefined })}
            >
              {category}
              <X className="size-3.5" />
            </Button>
          ) : null}
          {q ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => goTo({ q: undefined })}
            >
              “{q}”
              <X className="size-3.5" />
            </Button>
          ) : null}
        </div>
      ) : null}

      {query.isPending ? <GridSkeleton count={PAGE_SIZE} /> : null}

      {query.isError && !query.data ? (
        <ErrorState
          error={query.error}
          fallback="The catalog could not be loaded."
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {query.data && query.data.items.length === 0 ? (
        <EmptyState
          title="Nothing matches that"
          description={
            category || q
              ? 'Try clearing the filters above.'
              : 'The catalog is empty right now.'
          }
          action={
            category || q ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => goTo({ category: undefined, q: undefined })}
              >
                Clear filters
              </Button>
            ) : null
          }
        />
      ) : null}

      {query.data && query.data.items.length > 0 ? (
        <>
          <div
            className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4"
            style={{ opacity: query.isPlaceholderData ? 0.6 : 1 }}
          >
            {query.data.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <Pagination
            page={query.data.page}
            totalPages={query.data.total_pages}
            onChange={(next) => {
              void navigate({ search: (prev) => ({ ...prev, page: next }) })
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          />
        </>
      ) : null}
    </div>
  )
}
