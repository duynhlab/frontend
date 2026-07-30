import type { Product } from "@/api/types/product";
import ProductCard from "./ProductCard";

/**
 * ProductGrid — presentational grid, no API calls.
 * Uses a composite key (id + index) to prevent silent deduplication if the
 * backend returns items with duplicate IDs.
 */
export default function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div
      aria-busy="false"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {products.map((product, index) => (
        <ProductCard key={`${product.id}-${index}`} product={product} />
      ))}
    </div>
  );
}
