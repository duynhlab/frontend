import useSWR from "swr";
import { getOrders } from "@/api/orderApi";
import type { Order } from "@/api/types/order";
import { toAppError, type AppError } from "@/lib/errors";

/**
 * Custom hook for fetching the paginated order list with SWR.
 * Mirrors useProducts: SWR key encodes the page so each page is cached, and
 * keepPreviousData keeps the current page visible while the next one loads.
 * The order API paginates with `page` / `page_size`.
 */
export function useOrders({ page = 1, pageSize = 10, enabled = true } = {}): {
  orders: Order[];
  total: number;
  totalPages: number;
  loading: boolean;
  error: AppError | null;
  refresh: () => void;
} {
  const { data, error, isLoading, mutate } = useSWR(
    enabled ? (["orders", { page, pageSize }] as const) : null,
    ([, params]) => getOrders({ page: params.page, page_size: params.pageSize }),
    {
      revalidateOnFocus: false,
      dedupingInterval: 2000,
      revalidateOnReconnect: true,
      keepPreviousData: true, // keep current page while loading the next
    },
  );

  const total = data?.total_items ?? 0;
  return {
    orders: data?.items || [],
    total,
    totalPages: data?.total_pages ?? (total ? Math.ceil(total / pageSize) : 0),
    loading: isLoading,
    error: error === undefined ? null : toAppError(error),
    // Bound revalidate for callers that change order state (e.g. cancel).
    // The key is a tuple, so `globalMutate("orders")` would not match it —
    // this is the only way to invalidate the list from outside.
    refresh: () => void mutate(),
  };
}
