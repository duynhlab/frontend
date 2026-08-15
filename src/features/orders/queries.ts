import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { getOrderDetails, listOrders } from '@/features/orders/api'

export const orderKeys = {
  all: ['orders'] as const,
  list: (page: number) => ['orders', 'list', page] as const,
  details: (id: string) => ['orders', 'details', id] as const,
}

export const ORDERS_PAGE_SIZE = 10

export function ordersQuery(page: number, enabled: boolean) {
  return queryOptions({
    queryKey: orderKeys.list(page),
    queryFn: ({ signal }) =>
      listOrders({ page, page_size: ORDERS_PAGE_SIZE }, signal),
    enabled,
    placeholderData: keepPreviousData,
  })
}

export function orderDetailsQuery(id: string, enabled: boolean) {
  return queryOptions({
    queryKey: orderKeys.details(id),
    queryFn: ({ signal }) => getOrderDetails(id, signal),
    enabled,
  })
}
