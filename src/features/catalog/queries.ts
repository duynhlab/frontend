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
