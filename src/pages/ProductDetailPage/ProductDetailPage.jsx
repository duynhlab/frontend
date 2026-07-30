import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useSWRConfig } from 'swr';
import PlaceholderImage from '../../components/common/PlaceholderImage';
import { DetailSkeleton } from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import ApiError from '../../components/common/ApiError';
import ApiDebug from '../../components/common/ApiDebug';
import QuantitySelector from '../../components/domain/QuantitySelector';
import StarRating from '../../components/common/StarRating';
import { useToast } from '../../hooks/useToast';
import { useApiQuery } from '../../hooks/useApiQuery';
import { getProductDetails } from '../../api/productApi';
import { addToCart } from '../../api/cartApi';
import { createReview } from '../../api/reviewApi';
import { formatCurrency } from '@/lib/format';
import { isAuthenticated as hasStoredToken, getStoredUser } from '@/auth/tokens';

// Helper functions moved outside component to avoid recreation on every render
function formatReviewDate(review) {
    const dateValue = review.created_at || review.createdAt;
    if (!dateValue) return '—';
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getReviewAuthor(review) {
    return review.username || review.user_name || 'Guest';
}

function getInitial(name) {
    return (name || 'G').trim().charAt(0).toUpperCase() || 'G';
}

/**
 * ProductDetailPage
 * 3-Layer Pattern Compliance: Uses aggregation endpoint GET /product/v1/public/products/:id/details
 * This endpoint aggregates product details, stock, reviews, and related products.
 * Frontend MUST use aggregation endpoints - no client-side orchestration.
 */
export default function ProductDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { notify } = useToast();
    const { mutate: globalMutate } = useSWRConfig();

    // Product details via SWR aggregation endpoint (product + stock + reviews)
    const { data, loading, error, mutate } = useApiQuery(
        ['product-details', id],
        () => getProductDetails(id)
    );

    // Reviews come from the aggregation payload (3-layer compliance)
    const reviews = useMemo(
        () => (Array.isArray(data?.reviews) ? data.reviews : []),
        [data]
    );

    const [quantity, setQuantity] = useState(1);
    const [adding, setAdding] = useState(false);

    // Auth state - moved to useMemo to avoid localStorage reads in render
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authUser, setAuthUser] = useState(null);

    useEffect(() => {
        setIsAuthenticated(hasStoredToken());
        setAuthUser(getStoredUser());
    }, []);

    // Review form state
    const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', comment: '' });
    const [submittingReview, setSubmittingReview] = useState(false);

    // Compute hasReviewed: check if current user already has a review for this product
    const hasReviewed = useMemo(() => {
        return isAuthenticated && authUser?.id && reviews.some(
            (r) => String(r.user_id) === String(authUser.id)
        );
    }, [isAuthenticated, authUser?.id, reviews]);

    // Auto-scroll to reviews section when #reviews hash is present
    useEffect(() => {
        if (location.hash === '#reviews' && !loading) {
            const reviewsSection = document.getElementById('reviews');
            if (reviewsSection) {
                reviewsSection.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [location.hash, loading]);

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        if (!authUser?.id) {
            notify('error', 'User not found. Please log in again.');
            return;
        }
        setSubmittingReview(true);
        try {
            const result = await createReview(
                id,
                authUser.id,
                reviewForm.rating,
                reviewForm.title,
                reviewForm.comment
            );
            if (import.meta.env.DEV) {
                console.log('[API] POST /reviews:', result);
            }
            notify('success', 'Review submitted!');
            setReviewForm({ rating: 5, title: '', comment: '' });
            // Refresh reviews list - try aggregation first, fallback to direct API
            await mutate();
        } catch (err) {
            // Check for 409 Conflict (duplicate review) - fallback for stale UI state
            const isDuplicate = err.response?.status === 409 ||
                (err.message && err.message.toLowerCase().includes('already exists'));
            
            if (isDuplicate) {
                notify('info', 'You have already reviewed this product.');
                // Refresh reviews to update hasReviewed and hide the form
                await mutate();
            } else {
                notify('error', err.message || 'Failed to submit review');
            }
            if (import.meta.env.DEV) {
                console.error('[API ERROR] Create review:', err);
            }
        } finally {
            setSubmittingReview(false);
        }
    };

    const handleAddToCart = async () => {
        setAdding(true);
        try {
            const result = await addToCart(
                id,
                data.product.name,
                data.product.price,
                quantity
            );
            if (import.meta.env.DEV) {
                console.log('[API] POST /cart:', result);
            }
            notify('success', 'Added to cart', { id: 'cart-add' });
            setQuantity(1);
            // Bump the header badge instantly by the amount added, then reconcile.
            globalMutate('cart-count', prev => ({ count: (prev?.count ?? 0) + quantity }), { revalidate: true });
        } catch (err) {
            notify('error', err.message || 'Cannot add item to cart');
            if (import.meta.env.DEV) {
                console.error('[API ERROR]:', err);
            }
        } finally {
            setAdding(false);
        }
    };

    // Memoize expensive computations
    const averageRating = useMemo(() => {
        return reviews.length > 0
            ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
            : 0;
    }, [reviews]);

    return (
        <div className="page container">
            <Link to="/products" className="back-link">← Back to Products</Link>
            <p className="api-label">API: GET /product/v1/public/products/{id}/details</p>

            {/* Loading */}
            {loading && <DetailSkeleton />}

            {/* Error */}
            {!loading && error && (
                <ApiError error={error} endpoint={`GET /product/v1/public/products/${id}/details`} />
            )}

            {/* Empty */}
            {!loading && !error && !data?.product && (
                <EmptyState message="Product not found" icon="🔍" />
            )}

            {/* Product Detail */}
            {!loading && !error && data?.product && (
                <>
                    <div className="detail-layout">
                        <div className="detail-image">
                            <PlaceholderImage size="large" label="Product Image" />
                        </div>

                        <div className="detail-info">
                            <h1>{data.product.name}</h1>
                            <p className="detail-description">{data.product.description}</p>
                            <p className="detail-price">{formatCurrency(data.product.price)}</p>

                            {data.stock && (
                                <p className={data.stock.available ? 'stock-available' : 'stock-out'}>
                                    {data.stock.available
                                        ? `In Stock (${data.stock.quantity})`
                                        : 'Out of Stock'}
                                </p>
                            )}

                            <QuantitySelector
                                quantity={quantity}
                                onChange={setQuantity}
                                min={1}
                            />

                            <button
                                className="btn-primary add-to-cart-btn"
                                onClick={handleAddToCart}
                                disabled={adding || !data.stock?.available}
                            >
                                {adding ? 'Adding...' : 'Add to Cart'}
                            </button>
                        </div>
                    </div>

                    {/* Reviews */}
                    <div id="reviews" className="reviews-section">
                        <h2>Customer Reviews</h2>

                        {reviews.length > 0 ? (
                            <>
                                <div className="reviews-summary">
                                    <div className="reviews-score-block">
                                        <span className="reviews-score">{averageRating}</span>
                                        <span className="reviews-score-max">/5</span>
                                    </div>
                                    <div className="reviews-score-meta">
                                        <StarRating value={Number(averageRating)} />
                                        <span className="text-muted">
                                            {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                </div>

                                <div className="reviews-list">
                                    {reviews.map(review => (
                                        <div key={review.id} className="review-item">
                                            <div className="review-header">
                                                <span className="review-avatar" aria-hidden="true">
                                                    {getInitial(getReviewAuthor(review))}
                                                </span>
                                                <div className="review-meta">
                                                    <span className="review-author">{getReviewAuthor(review)}</span>
                                                    <span className="review-date text-muted">{formatReviewDate(review)}</span>
                                                </div>
                                                <StarRating value={review.rating} />
                                            </div>
                                            {review.title && <h4>{review.title}</h4>}
                                            <p className="review-comment">{review.comment}</p>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <EmptyState message="No reviews yet" icon="📝" />
                        )}

                        {/* Write a Review */}
                        <div className="write-review" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                            <h3>Write a Review</h3>
                            {!isAuthenticated ? (
                                // Not logged in: show login prompt
                                <div className="empty" style={{ padding: '1rem' }}>
                                    <p>Please log in or sign up to write a review.</p>
                                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                        <button
                                            className="primary"
                                            onClick={() => navigate('/login?mode=login&returnTo=' + encodeURIComponent(`/products/${id}#reviews`))}
                                        >
                                            Login
                                        </button>
                                        <button
                                            onClick={() => navigate('/login?mode=register&returnTo=' + encodeURIComponent(`/products/${id}#reviews`))}
                                        >
                                            Register
                                        </button>
                                    </div>
                                </div>
                            ) : hasReviewed ? (
                                // Already reviewed: show message
                                <div className="empty" style={{ padding: '1rem' }}>
                                    <p>You have already reviewed this product.</p>
                                </div>
                            ) : (
                                // Logged in + not reviewed: show form
                                <form onSubmit={handleSubmitReview}>
                                    <div className="form-group">
                                        <label>Rating</label>
                                        <select
                                            value={reviewForm.rating}
                                            onChange={(e) => setReviewForm({ ...reviewForm, rating: parseInt(e.target.value) })}
                                            style={{ width: 'auto' }}
                                        >
                                            <option value={5}>⭐⭐⭐⭐⭐ (5)</option>
                                            <option value={4}>⭐⭐⭐⭐ (4)</option>
                                            <option value={3}>⭐⭐⭐ (3)</option>
                                            <option value={2}>⭐⭐ (2)</option>
                                            <option value={1}>⭐ (1)</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Title (optional)</label>
                                        <input
                                            type="text"
                                            placeholder="Summary of your review"
                                            value={reviewForm.title}
                                            onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Comment</label>
                                        <textarea
                                            placeholder="Share your thoughts about this product..."
                                            value={reviewForm.comment}
                                            onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                                            rows={3}
                                            style={{ width: '100%', resize: 'vertical' }}
                                            required
                                        />
                                    </div>
                                    <button type="submit" className="primary" disabled={submittingReview}>
                                        {submittingReview ? 'Submitting...' : 'Submit Review'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* API Debug (dev only) */}
            <ApiDebug data={{ product: data, reviews }} />
        </div>
    );
}
