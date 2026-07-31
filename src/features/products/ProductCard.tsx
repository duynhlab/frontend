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
        style={{ contentVisibility: "auto", containIntrinsicSize: "0 296px" }}
      >
        <div className="aspect-[4/3] overflow-hidden bg-secondary">
          <PlaceholderImage size="small" />
        </div>
        <div className="space-y-0.5 p-2.5">
          {/*
            min-h-10 reserves both title lines (2 x 20px) unconditionally, so a
            one-line name and a two-line name produce identical card heights.
            Without it the grid row stretches to the longest title, prices stop
            aligning across the row, and containIntrinsicSize below can never be
            right for more than one card.
          */}
          <h3 className="line-clamp-2 min-h-10 text-sm font-medium text-foreground">
            {product.name}
          </h3>
          <p className="text-sm font-semibold text-primary">
            {formatCurrency(product.price)}
          </p>
        </div>
      </Link>
    </article>
  );
}
