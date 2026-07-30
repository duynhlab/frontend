import { Skeleton } from "@/components/ui/skeleton";

export { Skeleton };

/**
 * ProductCardSkeleton — loading placeholder for one product card.
 * aria-hidden: skeletons are decorative; the busy state is announced by the
 * aria-busy container (GridSkeleton), and tests count real cards by role.
 */
export function ProductCardSkeleton() {
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-lg border bg-card">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-5 w-2/5" />
      </div>
    </div>
  );
}

/** GridSkeleton — loading state for the product grid (and app Suspense). */
export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      aria-busy="true"
      className="container mx-auto grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
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
