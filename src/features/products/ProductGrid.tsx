import type { Product } from "@/api/types/product";
import ProductCard from "./ProductCard";

/**
 * The catalog grid, shared with GridSkeleton so the loading state can never
 * lay out differently from the loaded one.
 *
 * `auto-fill` with a minimum track, not a fixed column count: the column count
 * has to follow the available width, and a hard-coded ceiling is what limited
 * a 2048px viewport to four cards. `auto-fill` rather than `auto-fit` — the
 * latter collapses empty tracks, which would stretch a two-result page into
 * half-width cards.
 *
 * Below `sm` the tracks are explicit: at 328px of content a minimum track wide
 * enough to be useful would resolve to a single column.
 */
export const PRODUCT_GRID_CLASS =
  "grid grid-cols-2 gap-2 sm:gap-3 " +
  "sm:grid-cols-[repeat(auto-fill,minmax(216px,1fr))] " +
  "lg:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] " +
  "xl:grid-cols-[repeat(auto-fill,minmax(272px,1fr))]";

/**
 * ProductGrid — presentational grid, no API calls.
 * Uses a composite key (id + index) to prevent silent deduplication if the
 * backend returns items with duplicate IDs.
 */
export default function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div aria-busy="false" className={PRODUCT_GRID_CLASS}>
      {products.map((product, index) => (
        <ProductCard key={`${product.id}-${index}`} product={product} />
      ))}
    </div>
  );
}
