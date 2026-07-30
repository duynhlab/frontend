import useSWR, { type Key, type KeyedMutator, type SWRConfiguration } from "swr";
import { toAppError, type AppError } from "@/lib/errors";

/**
 * useApiQuery Hook
 * Wrapper around SWR for consistent data fetching.
 *
 * `error` is a normalized AppError (never a bare string), so flags like
 * `isRateLimit` and `status` survive to the UI — render `error.message`.
 *
 * Usage:
 *   const { data, loading, error, mutate } = useApiQuery('orders', getOrders);
 *   const { data, loading, error } = useApiQuery(
 *     isAuthenticated ? 'cart' : null, // Conditional fetching
 *     getCart
 *   );
 */
export function useApiQuery<TData>(
  key: Key,
  fetcher: () => Promise<TData>,
  options: SWRConfiguration<TData> = {},
): {
  data: TData | null;
  loading: boolean;
  error: AppError | null;
  mutate: KeyedMutator<TData>;
} {
  const { data, error, isLoading, mutate } = useSWR<TData>(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 2000, // Dedupe requests within 2s
    errorRetryCount: 2,
    // Never retry a rate-limited request — retrying only feeds the limiter.
    // For every other error, mirror SWR's default retry: honor the retry cap,
    // pause while the tab is hidden or the client is offline, and back off
    // exponentially with jitter (so we don't regress the built-in behavior
    // for the other pages that use this hook).
    onErrorRetry: (err: unknown, _key, config, revalidate, opts) => {
      if (toAppError(err).isRateLimit) return;
      if (opts.retryCount > (config.errorRetryCount ?? 2)) return;
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        return;
      }
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return;
      }
      const backoff =
        ~~((Math.random() + 0.5) * (1 << Math.min(opts.retryCount, 8))) *
        config.errorRetryInterval;
      setTimeout(() => void revalidate(opts), backoff);
    },
    ...options,
  });

  return {
    data: data ?? null,
    loading: isLoading,
    error: error === undefined ? null : toAppError(error),
    mutate,
  };
}

export default useApiQuery;
