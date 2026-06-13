import useSWR from 'swr';
import { getProducts } from '../api/productApi';

/**
 * Custom hook for fetching products with SWR
 * SWR provides automatic request deduplication, caching, and revalidation
 * NOTE: No filter support - API doesn't have search/filter
 */
export function useProducts({ page = 1, limit = 30 } = {}) {
    const { data, error, isLoading } = useSWR(
        ['products', { page, limit }],
        ([_, params]) => getProducts(params),
        {
            revalidateOnFocus: false,
            dedupingInterval: 2000,
            revalidateOnReconnect: true,
            keepPreviousData: true, // Keep data while loading next page
        }
    );

    // Paginated envelope: real API uses total_items/total_pages; the mock uses total.
    const total = data?.total_items ?? data?.total ?? 0;
    return {
        products: data?.items || [],
        total,
        totalPages: data?.total_pages ?? (total ? Math.ceil(total / limit) : 0),
        loading: isLoading,
        error: error?.message || null,
    };
}
