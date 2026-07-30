import { useTransition } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductGrid from '../../components/domain/ProductGrid';
import Pagination from '@/components/common/AppPagination';
import { GridSkeleton } from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import ApiError from '@/components/common/AppError';
import { useProducts } from '../../hooks/useProducts';
import './ProductListPage.css';

const PRODUCTS_PER_PAGE = 24;

/**
 * ProductListPage - Product Catalog at /products
 * API: GET /product/v1/public/products?page=N&page_size=24
 *
 * Best practices applied:
 * - rerender-derived-state-no-effect: page derived from URL params, not useState
 * - rendering-conditional-render: ternary for conditional rendering
 * - client-swr-dedup: SWR with keepPreviousData for smooth page transitions
 */
export default function ProductListPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [isPending, startTransition] = useTransition();

    // Derive page number from URL during render (no useState needed)
    const page = Math.max(1, Number(searchParams.get('page')) || 1);

    const { products, total, totalPages, loading, error } = useProducts({
        page,
        pageSize: PRODUCTS_PER_PAGE,
    });

    // rerender-transitions: wrap non-urgent update in startTransition
    const handlePageChange = (newPage) => {
        startTransition(() => {
            setSearchParams({ page: String(newPage) });
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="page container product-list-page">
            <div className="product-list-page__header">
                <h2>Products</h2>
                {total > 0 ? (
                    <p className="api-label">
                        {total} items • Page {page} of {totalPages}
                    </p>
                ) : null}
            </div>

            {/* Loading State */}
            {loading ? <GridSkeleton count={24} /> : null}

            {/* Error State */}
            {!loading && error ? (
                <ApiError error={error} endpoint="GET /product/v1/public/products" />
            ) : null}

            {/* Empty State */}
            {!loading && !error && products.length === 0 ? (
                <EmptyState message="No products available" icon="📦" />
            ) : null}

            {/* Success State */}
            {!loading && !error && products.length > 0 ? (
                <>
                    <div style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                        <ProductGrid products={products} />
                    </div>
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                    />
                </>
            ) : null}
        </div>
    );
}
