import { useId } from "react";

interface PlaceholderImageProps {
  size?: "small" | "medium" | "large";
  label?: string;
}

const DIMENSIONS: Record<NonNullable<PlaceholderImageProps["size"]>, number> = {
  small: 100,
  medium: 400,
  large: 600,
};

/**
 * PlaceholderImage — static placeholder for all product images.
 * The gradient id is instance-unique (useId): the legacy version reused one
 * hard-coded id, producing duplicate DOM ids across a grid.
 */
export default function PlaceholderImage({
  size = "medium",
  label = "Product",
}: PlaceholderImageProps) {
  const gradientId = useId();
  const dim = DIMENSIONS[size];

  return (
    <svg
      viewBox={`0 0 ${dim} ${dim}`}
      fill="none"
      className="h-full w-full"
      role="img"
      aria-label={`${label} placeholder image`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--secondary)" />
          <stop offset="100%" stopColor="var(--card)" />
        </linearGradient>
      </defs>
      <rect width={dim} height={dim} fill={`url(#${gradientId})`} />
      <text
        x={dim / 2}
        y={dim * 0.45}
        textAnchor="middle"
        fill="var(--muted-foreground)"
        fontSize={dim / 8}
        aria-hidden="true"
      >
        📦
      </text>
      <text
        x={dim / 2}
        y={dim * 0.6}
        textAnchor="middle"
        fill="var(--muted-foreground)"
        fontSize={dim / 18}
        aria-hidden="true"
      >
        {label}
      </text>
    </svg>
  );
}
