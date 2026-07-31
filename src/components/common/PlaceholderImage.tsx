import { cn } from "@/lib/utils";

interface PlaceholderImageProps {
  size?: "small" | "medium" | "large";
  label?: string;
}

const ICON_SIZE: Record<NonNullable<PlaceholderImageProps["size"]>, string> = {
  small: "text-xl",
  medium: "text-3xl",
  large: "text-4xl",
};

/**
 * PlaceholderImage — static placeholder for all product images.
 *
 * Not an SVG: a square `viewBox` letterboxes inside the 4:3 media boxes under
 * the default `preserveAspectRatio`, which would put a small image back inside
 * a void — the exact complaint this refactor is fixing. A plain box does no
 * aspect math and fills whatever its parent gives it, at any ratio.
 *
 * A real image is a drop-in replacement: `<img className="h-full w-full
 * object-cover">` occupies the same box with the same cropping contract, and
 * the ratio stays owned solely by the parent.
 */
export default function PlaceholderImage({
  size = "medium",
  label = "Product",
}: PlaceholderImageProps) {
  return (
    <div
      role="img"
      aria-label={`${label} placeholder image`}
      className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-card"
    >
      <span aria-hidden="true" className={cn("text-muted-foreground", ICON_SIZE[size])}>
        📦
      </span>
    </div>
  );
}
