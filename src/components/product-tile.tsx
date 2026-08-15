import { productHue, productInitials } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * The stand-in for a product photo.
 *
 * The catalog has no images — product-service stores none — so inventing a
 * stock photo would be a claim about goods the shop does not have. The tile
 * derives its hue from the product name instead, which makes each product
 * visually identifiable and stable across the grid, the cart, and the order it
 * ends up in, without pretending to be a photograph.
 */
export function ProductTile({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  const hue = productHue(name)
  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border select-none',
        className,
      )}
      // Only the hue comes from the product. Lightness and chroma are theme
      // tokens, so the tile follows light/dark instead of burning a wall of
      // pastel into a dark page.
      style={{
        backgroundColor: `oklch(var(--tile-bg-l) var(--tile-bg-c) ${hue})`,
        color: `oklch(var(--tile-fg-l) var(--tile-fg-c) ${hue})`,
      }}
    >
      <span className="font-mono text-[clamp(1.25rem,18cqw,3rem)] font-medium tracking-tight">
        {productInitials(name)}
      </span>
    </div>
  )
}
