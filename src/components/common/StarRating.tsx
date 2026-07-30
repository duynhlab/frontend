import { StarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  /** 0–5; rounded to the nearest star for the fill. */
  value?: number;
  className?: string;
}

/**
 * StarRating — presentational 5-star scale. The exact value is exposed to
 * assistive tech via aria-label; the stars themselves are decorative.
 */
export default function StarRating({ value = 0, className }: StarRatingProps) {
  const filled = Math.round(value);

  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon
          key={n}
          aria-hidden="true"
          className={cn(
            "size-4",
            n <= filled
              ? "fill-warning text-warning"
              : "fill-muted text-muted",
          )}
        />
      ))}
    </span>
  );
}
