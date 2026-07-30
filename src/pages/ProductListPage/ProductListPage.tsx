import { useTransition } from "react";
import { useSearchParams } from "react-router-dom";
import ProductGrid from "@/features/products/ProductGrid";
import AppPagination from "@/components/common/AppPagination";
import { GridSkeleton } from "@/components/common/Skeleton";
import EmptyState from "@/components/common/EmptyState";
import AppError from "@/components/common/AppError";
import { useProducts } from "@/hooks/useProducts";

const PRODUCTS_PER_PAGE = 24;

/**
 * ProductListPage — product catalog at /products.
 * API: GET /product/v1/public/products?page=N&page_size=24
 *
 * Page number is derived from the URL (no useState); page changes are
 * wrapped in a transition so the previous page stays visible while loading.
 */
export default function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const { products, total, totalPages, loading, error } = useProducts({
    page,
    pageSize: PRODUCTS_PER_PAGE,
  });

  const handlePageChange = (newPage: number) => {
    startTransition(() => {
      setSearchParams({ page: String(newPage) });
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="container mx-auto px-4 py-4">
      <div className="mb-4">
        <h2 className="text-xl font-semibold tracking-tight">Products</h2>
        {total > 0 ? (
          <p className="font-mono text-xs text-muted-foreground">
            {total} items • Page {page} of {totalPages}
          </p>
        ) : null}
      </div>

      {loading ? <GridSkeleton count={24} /> : null}

      {!loading && error ? (
        <AppError error={error} endpoint="GET /product/v1/public/products" />
      ) : null}

      {!loading && !error && products.length === 0 ? (
        <EmptyState message="No products available" icon="📦" />
      ) : null}

      {!loading && !error && products.length > 0 ? (
        <>
          <div
            className="transition-opacity duration-200"
            style={{ opacity: isPending ? 0.6 : 1 }}
          >
            <ProductGrid products={products} />
          </div>
          <AppPagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      ) : null}
    </div>
  );
}
