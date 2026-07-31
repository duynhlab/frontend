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
    // Mirrors ProductDetailPage's media cap and column template, so the row
    // height is the same before and after the payload arrives.
    <div aria-busy="true" className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,520px)_1fr]">
      <Skeleton className="mx-auto aspect-[4/3] w-full max-w-[520px] lg:mx-0" />
      <div className="space-y-3" aria-hidden="true">
        <Skeleton className="h-[30px] w-3/5" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-[26px] w-24" />
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-36" />
      </div>
    </div>
  );
}
