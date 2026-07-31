import PageShell from "@/components/layout/PageShell";
import { PRODUCT_GRID_CLASS } from "@/features/products/ProductGrid";
import { Skeleton } from "@/components/ui/skeleton";

export { Skeleton };

/**
 * ProductCardSkeleton — loading placeholder for one product card.
 * aria-hidden: skeletons are decorative; the busy state is announced by the
 * aria-busy container (GridSkeleton), and tests count real cards by role.
 */
export function ProductCardSkeleton() {
  return (
    // Box model mirrors ProductCard exactly (media + 2.5 padding + a 40px
    // two-line title reserve + a 20px price row), so nothing jumps when the
    // payload lands.
    <div aria-hidden="true" className="overflow-hidden rounded-lg border bg-card">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-0.5 p-2.5">
        <Skeleton className="h-10 w-4/5" />
        <Skeleton className="h-5 w-2/5" />
      </div>
    </div>
  );
}

/**
 * GridSkeleton — loading state for the product grid.
 *
 * Carries no page container: it renders inside the page's own PageShell, and
 * declaring a second one nested two containers during route transitions.
 */
export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div aria-busy="true" className={PRODUCT_GRID_CLASS}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * RouteFallback — the Suspense placeholder for a lazily loaded route.
 *
 * Route-agnostic on purpose: the fallback fires for /login and /profile just
 * as often as for the catalog, so a product-grid shimmer would promise the
 * wrong layout. A title bar plus two lines reads as "a page is coming".
 */
export function RouteFallback() {
  return (
    <PageShell>
      <div aria-busy="true">
        <Skeleton className="h-6 w-40" />
        <div className="mt-4 space-y-2" aria-hidden="true">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-4/5" />
        </div>
      </div>
    </PageShell>
  );
}

/** DetailSkeleton — loading state for the product detail page. */
export function DetailSkeleton() {
  return (
    <div aria-busy="true" className="mt-3 grid grid-cols-1 gap-6 md:grid-cols-2">
      <Skeleton className="aspect-square w-full" />
      <div className="space-y-3" aria-hidden="true">
        <Skeleton className="h-8 w-3/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-8 w-1/3" />
      </div>
    </div>
  );
}
