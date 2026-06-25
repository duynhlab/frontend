import './StarRating.css';

/**
 * StarRating
 * Presentational 5-star scale with filled + empty stars so the rating is
 * readable at a glance. `value` is 0–5 and is rounded to the nearest star
 * for the fill; the exact value is exposed to assistive tech via aria-label.
 */
export default function StarRating({ value = 0, className = '' }) {
    const filled = Math.round(value);

    return (
        <span
            className={`star-rating ${className}`.trim()}
            role="img"
            aria-label={`${value} out of 5 stars`}
        >
            {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={n <= filled ? 'star-on' : 'star-off'} aria-hidden="true">
                    ★
                </span>
            ))}
        </span>
    );
}
