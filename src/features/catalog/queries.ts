import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import {
  getProductDetails,
  listProducts,
  type CatalogQuery,
} from '@/features/catalog/api'

export const catalogKeys = {
  all: ['catalog'] as const,
  list: (query: CatalogQuery) => ['catalog', 'list', query] as const,
  details: (id: string) => ['catalog', 'details', id] as const,
  overview: ['catalog', 'overview'] as const,
}

/** What the home page needs: a real total, and the category buckets. */
export interface CatalogOverview {
  total: number
  categories: Array<{ name: string; count: number }>
}

const OVERVIEW_LIMIT = 100

/**
 * The home page's single read.
 *
 * The category list is DERIVED from one page of products, not read from a
 * taxonomy: the only categories endpoint is `/product/v1/protected/categories`,
 * which the edge gates behind a staff-realm token and `backoffice_admin`, so a
 * shopper cannot call it at all.
 *
 * That derivation is honest while the catalog fits in one page — it does not
 * scale. Past `OVERVIEW_LIMIT` products the counts silently under-report
 * whatever falls outside the page. The real fix is a public categories route on
 * product-service; until then this comment is the warning.
 */
export function catalogOverviewQuery() {
  return queryOptions({
    queryKey: catalogKeys.overview,
    queryFn: async ({ signal }): Promise<CatalogOverview> => {
      const page = await listProducts({ page: 1, limit: OVERVIEW_LIMIT }, signal)

      const counts = new Map<string, number>()
      for (const product of page.items) {
        // product-service COALESCEs a missing category to "Uncategorized", and
        // some payloads carry an empty string — both are one bucket, and
        // neither may render as a nameless chip.
        const name = product.category?.trim() || 'Uncategorized'
        counts.set(name, (counts.get(name) ?? 0) + 1)
      }

      return {
        total: page.total_items,
        categories: [...counts]
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
      }
    },
  })
}

export function productsQuery(query: CatalogQuery) {
  return queryOptions({
    queryKey: catalogKeys.list(query),
    queryFn: ({ signal }) => listProducts(query, signal),
    // Paging keeps the previous page on screen instead of flashing skeletons
    // between two nearly identical grids.
    placeholderData: keepPreviousData,
  })
}

export function productDetailsQuery(id: string) {
  return queryOptions({
    queryKey: catalogKeys.details(id),
    queryFn: ({ signal }) => getProductDetails(id, signal),
  })
}
