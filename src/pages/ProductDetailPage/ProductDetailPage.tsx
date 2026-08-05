import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useSWRConfig } from "swr";
import PlaceholderImage from "@/components/common/PlaceholderImage";
import { DetailSkeleton } from "@/components/common/Skeleton";
import EmptyState from "@/components/common/EmptyState";
import AppError from "@/components/common/AppError";
import ApiDebug from "@/components/common/ApiDebug";
import QuantitySelector from "@/features/products/QuantitySelector";
import ReviewForm from "@/features/products/ReviewForm";
import StarRating from "@/components/common/StarRating";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { notify } from "@/lib/notifications";
import { toAppError } from "@/lib/errors";
import { useApiQuery } from "@/hooks/useApiQuery";
import { getProductDetails } from "@/api/productApi";
import { addToCart } from "@/api/cartApi";
import type { CartCount } from "@/api/types/cart";
import type { Review } from "@/api/types/product";
import { formatCurrency } from "@/lib/format";
import {
  describeAvailability,
  isPurchasable,
  purchasableQuantity,
  type AvailabilityTone,
} from "@/lib/availability";
import { cn } from "@/lib/utils";
import { getStoredUser, isAuthenticated as hasStoredToken } from "@/auth/tokens";
import type { StoredUser } from "@/api/types/auth";
import PageShell from "@/components/layout/PageShell";

function formatReviewDate(review: Review): string {
  if (!review.created_at) return "—";
  const date = new Date(review.created_at);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getInitial(name: string): string {
  return (name || "G").trim().charAt(0).toUpperCase() || "G";
}

const AVAILABILITY_TONE: Record<AvailabilityTone, string> = {
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  muted: "text-muted-foreground",
};

/**
 * ProductDetailPage — uses the aggregation endpoint
 * GET /product/v1/public/products/:id/details (product + availability + reviews
 * in one call; no client-side orchestration).
 */
export default function ProductDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { mutate: globalMutate } = useSWRConfig();

  const { data, loading, error, mutate } = useApiQuery(
    ["product-details", id],
    () => getProductDetails(id),
  );

  const reviews = useMemo(
    () => (Array.isArray(data?.reviews) ? data.reviews : []),
    [data],
  );

  /**
   * Availability comes from inventory-service via the details aggregation
   * (RFC-0021). `data.stock` is product-service's own frozen column and is read
   * only as a fallback for a product build that predates the enrichment, so the
   * page works regardless of the order the two services deploy in.
   *
   * The purchase gate reads the same source as the label, deliberately: gating
   * on the frozen column while labelling from inventory lets the button
   * contradict the text, and makes Add to Cart die outright the day the `stock`
   * block is removed.
   */
  const availability = useMemo(
    () => describeAvailability(data?.availability, data?.stock),
    [data],
  );
  const purchasable = useMemo(
    () => isPurchasable(data?.availability, data?.stock),
    [data],
  );
  const maxQuantity = useMemo(
    () => purchasableQuantity(data?.availability, data?.stock),
    [data],
  );

  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUser, setAuthUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    setIsAuthenticated(hasStoredToken());
    setAuthUser(getStoredUser());
  }, []);

  const hasReviewed = useMemo(() => {
    return (
      isAuthenticated &&
      !!authUser?.id &&
      reviews.some((r) => String(r.user_id) === String(authUser.id))
    );
  }, [isAuthenticated, authUser, reviews]);

  // Auto-scroll to reviews section when #reviews hash is present
  useEffect(() => {
    if (location.hash === "#reviews" && !loading) {
      document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [location.hash, loading]);

  const handleAddToCart = async () => {
    if (!data?.product) return;
    setAdding(true);
    try {
      await addToCart(id, data.product.name, data.product.price, quantity);
      // Same dedup key on rapid clicks: the toast updates in place.
      notify.success("Added to cart", { dedupKey: "cart-add" });
      setQuantity(1);
      // Bump the header badge instantly by the amount added, then reconcile.
      void globalMutate(
        "cart-count",
        (prev: CartCount | undefined) => ({ count: (prev?.count ?? 0) + quantity }),
        { revalidate: true },
      );
    } catch (err) {
      notify.error(toAppError(err, "Cannot add item to cart").message);
    } finally {
      setAdding(false);
    }
  };

  const averageRating = useMemo(() => {
    return reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;
  }, [reviews]);

  const reviewsReturnTo = encodeURIComponent(`/products/${id}#reviews`);

  return (
    <PageShell>
      <Link
        to="/products"
        className="mb-3 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to Products
      </Link>
      <p className="mb-3 font-mono text-xs text-muted-foreground">
        API: GET /product/v1/public/products/{id}/details
      </p>

      {loading && <DetailSkeleton />}

      {!loading && error && (
        <AppError
          error={error}
          endpoint={`GET /product/v1/public/products/${id}/details`}
        />
      )}

      {!loading && !error && !data?.product && (
        <EmptyState message="Product not found" icon="🔍" />
      )}

      {!loading && !error && data?.product && (
        <>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,520px)_1fr]">
            {/*
              The media is capped rather than sized by its column. Splitting
              into two columns before `lg` left the info side around 280px,
              and letting the media fill a single column is what produced the
              giant square panel on tablet.
            */}
            <div className="mx-auto aspect-[4/3] w-full max-w-[520px] overflow-hidden rounded-lg bg-secondary lg:mx-0">
              <PlaceholderImage size="large" label="Product Image" />
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                {data.product.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {data.product.description}
              </p>
              {/* One step below the name: the price should not compete with it. */}
              <p className="text-xl font-semibold text-primary">
                {formatCurrency(data.product.price)}
              </p>

              {availability && (
                <p className={cn("text-sm", AVAILABILITY_TONE[availability.tone])}>
                  {availability.label}
                </p>
              )}

              <QuantitySelector
                quantity={quantity}
                onChange={setQuantity}
                min={1}
                {...(maxQuantity !== undefined && { max: maxQuantity })}
              />

              <Button
                size="lg"
                onClick={() => void handleAddToCart()}
                disabled={adding || !purchasable}
                aria-busy={adding}
              >
                {adding ? "Adding..." : "Add to Cart"}
              </Button>
            </div>
          </div>

          {/* Reviews */}
          <section id="reviews" className="mt-6 max-w-3xl">
            <h2 className="text-base font-semibold">Customer Reviews</h2>

            {reviews.length > 0 ? (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-semibold">
                      {averageRating.toFixed(1)}
                    </span>
                    <span className="text-sm text-muted-foreground">/5</span>
                  </div>
                  <StarRating value={averageRating} />
                  <p className="text-sm text-muted-foreground">
                    {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                  </p>
                </div>

                {/*
                  One bordered surface with dividers, not N bordered cards: a
                  card per review paid for its own border and padding on every
                  row and stacked another 16px gap between them.
                */}
                <ul className="mt-3 divide-y rounded-lg border bg-card">
                  {reviews.map((review) => (
                    <li key={review.id} className="p-3">
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="flex size-8 items-center justify-center rounded-full bg-secondary text-sm font-semibold"
                        >
                          {getInitial(review.username)}
                        </span>
                        <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
                          <p className="text-sm font-medium">
                            {review.username || "Guest"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatReviewDate(review)}
                          </p>
                        </div>
                        <StarRating value={review.rating} />
                      </div>
                      {review.title && (
                        <h4 className="mt-1 text-sm font-semibold">{review.title}</h4>
                      )}
                      {/* ~65ch: the comment previously ran the full page width. */}
                      <p className="mt-1 max-w-prose text-sm text-muted-foreground">
                        {review.comment}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="mt-3">
                <EmptyState message="No reviews yet" icon="📝" />
              </div>
            )}

            {/* Write a Review */}
            <Separator className="my-4" />
            <h3 className="text-sm font-semibold">Write a Review</h3>
            <div className="mt-3">
              {!isAuthenticated ? (
                /*
                  An inline prompt, not an EmptyState: this is a gated action,
                  not an absence of data, so the "no data" primitive was the
                  wrong one — and it stacked its two buttons in a column.
                */
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed p-3">
                  <p className="text-sm text-muted-foreground">
                    Please log in or sign up to write a review.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() =>
                        void navigate(`/login?mode=login&returnTo=${reviewsReturnTo}`)
                      }
                    >
                      Login
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        void navigate(`/login?mode=register&returnTo=${reviewsReturnTo}`)
                      }
                    >
                      Register
                    </Button>
                  </div>
                </div>
              ) : hasReviewed ? (
                <p className="text-sm text-muted-foreground">
                  You have already reviewed this product.
                </p>
              ) : authUser ? (
                <ReviewForm
                  productId={id}
                  userId={authUser.id}
                  onSubmitted={() => mutate()}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  User not found. Please log in again.
                </p>
              )}
            </div>
          </section>
        </>
      )}

      <ApiDebug data={{ product: data, reviews }} />
    </PageShell>
  );
}
