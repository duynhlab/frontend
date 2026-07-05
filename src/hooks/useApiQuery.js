import useSWR from 'swr';

/**
 * useApiQuery Hook
 * Wrapper around SWR for consistent data fetching
 * 
 * Best practice: client-swr-dedup - automatic request deduplication
 * 
 * Usage:
 *   const { data, loading, error, mutate } = useApiQuery('orders', getOrders);
 *   const { data, loading, error } = useApiQuery(
 *     isAuthenticated ? 'cart' : null, // Conditional fetching
 *     getCart
 *   );
 * 
 * @param {string|null} key - SWR cache key (null to skip fetching)
 * @param {function} fetcher - Async function that returns data
 * @param {object} options - SWR options override
 */
export function useApiQuery(key, fetcher, options = {}) {
    const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 2000, // Dedupe requests within 2s
        errorRetryCount: 2,
        // Never retry a rate-limited request — retrying only feeds the limiter.
        // For every other error, mirror SWR's default retry: honor the retry cap,
        // pause while the tab is hidden or the client is offline, and back off
        // exponentially with jitter (so we don't regress the built-in behavior
        // for the other pages that use this hook).
        onErrorRetry: (error, _key, config, revalidate, opts) => {
            if (error?.isRateLimit || error?.response?.status === 429) return;
            if (opts.retryCount > config.errorRetryCount) return;
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
            if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
            const backoff = ~~((Math.random() + 0.5) * (1 << Math.min(opts.retryCount, 8))) * config.errorRetryInterval;
            setTimeout(() => revalidate(opts), backoff);
        },
        ...options,
    });

    return {
        data: data ?? null,
        loading: isLoading,
        error: error?.message || null,
        mutate,
    };
}

/**
 * useApiQueryWithTransform Hook
 * Same as useApiQuery but transforms the data
 * 
 * @param {string|null} key - SWR cache key
 * @param {function} fetcher - Async function that returns data
 * @param {function} transform - Transform function for data
 * @param {object} options - SWR options override
 */
export function useApiQueryWithTransform(key, fetcher, transform, options = {}) {
    const { data, loading, error, mutate } = useApiQuery(key, fetcher, options);

    return {
        data: data ? transform(data) : null,
        loading,
        error,
        mutate,
    };
}

export default useApiQuery;
