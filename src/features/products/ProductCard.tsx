import { Link } from "react-router-dom";
import PlaceholderImage from "@/components/common/PlaceholderImage";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/api/types/product";

/**
 * ProductCard — presentational card, no API calls. Rendered as an <article>
 * with an accessible name so tests and AT can count/locate real cards
 * (skeleton placeholders are aria-hidden and never match).
 */
export default function ProductCard({ product }: { product: Product }) {
  return (
    <article aria-label={product.name}>
      <Link
        to={`/products/${product.id}`}
        className="block overflow-hidden rounded-lg border bg-card transition-colors hover:border-primary hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        style={{ contentVisibility: "auto", containIntrinsicSize: "0 280px" }}
      >
        <div className="aspect-square bg-secondary">
          <PlaceholderImage size="small" />
        </div>
        <div className="space-y-1 p-3">
          <h3 className="text-sm font-medium text-foreground">{product.name}</h3>
          <p className="text-sm font-semibold text-primary">
            {formatCurrency(product.price)}
          </p>
        </div>
      </Link>
    </article>
  );
}
