import useSWR from "swr";
import { getProducts } from "@/api/productApi";
import type { Product } from "@/api/types/product";
import { toAppError, type AppError } from "@/lib/errors";

/**
 * Custom hook for fetching products with SWR
 * SWR provides automatic request deduplication, caching, and revalidation
 * NOTE: No filter support - API doesn't have search/filter
 */
export function useProducts({ page = 1, pageSize = 24 } = {}): {
  products: Product[];
  total: number;
  totalPages: number;
  loading: boolean;
  error: AppError | null;
} {
  const { data, error, isLoading } = useSWR(
    ["products", { page, page_size: pageSize }] as const,
    ([, params]) => getProducts(params),
    {
      revalidateOnFocus: false,
      dedupingInterval: 2000,
      revalidateOnReconnect: true,
      keepPreviousData: true, // Keep data while loading next page
    },
  );

  const total = data?.total_items ?? 0;
  return {
    products: data?.items || [],
    total,
    totalPages: data?.total_pages ?? (total ? Math.ceil(total / pageSize) : 0),
    loading: isLoading,
    error: error === undefined ? null : toAppError(error),
  };
}
