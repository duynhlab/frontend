import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * A rating out of five. The number is stated in text as well as drawn, so the
 * value survives for anyone who cannot see the stars.
 */
export function StarRating({
  value,
  size = 'sm',
  className,
}: {
  value: number
  size?: 'sm' | 'md'
  className?: string
}) {
  const rounded = Math.round(value)
  return (
    // role="img" is what makes the aria-label legal here: a bare <span> has no
    // role, and aria-label on a roleless element is prohibited (axe flags it
    // serious). The role also collapses the five icons into one announcement.
    <span
      role="img"
      className={cn('inline-flex items-center gap-0.5', className)}
      aria-label={`${value.toFixed(1)} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          className={cn(
            size === 'sm' ? 'size-3.5' : 'size-4',
            n <= rounded
              ? 'fill-warning text-warning'
              : 'text-muted-foreground/40',
          )}
        />
      ))}
    </span>
  )
}
