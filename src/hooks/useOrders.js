import useSWR from 'swr';
import { getOrders } from '../api/orderApi';

/**
 * Custom hook for fetching the paginated order list with SWR.
 * Mirrors useProducts: SWR key encodes the page so each page is cached, and
 * keepPreviousData keeps the current page visible while the next one loads.
 * The order API paginates with `page` / `page_size`.
 *
 * @param {object} opts
 * @param {number} opts.page      1-based page number
 * @param {number} opts.pageSize  items per page
 * @param {boolean} opts.enabled  skip fetching when false (e.g. not authenticated)
 */
export function useOrders({ page = 1, pageSize = 10, enabled = true } = {}) {
    const { data, error, isLoading, mutate } = useSWR(
        enabled ? ['orders', { page, pageSize }] : null,
        ([, params]) => getOrders({ page: params.page, page_size: params.pageSize }),
        {
            revalidateOnFocus: false,
            dedupingInterval: 2000,
            revalidateOnReconnect: true,
            keepPreviousData: true, // keep current page while loading the next
        }
    );

    const total = data?.total_items ?? 0;
    return {
        orders: data?.items || [],
        total,
        totalPages: data?.total_pages ?? (total ? Math.ceil(total / pageSize) : 0),
        loading: isLoading,
        error: error?.message || null,
        // Bound revalidate for callers that change order state (e.g. cancel).
        refresh: () => mutate(),
    };
}
