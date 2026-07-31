import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * The single page-width authority. Tailwind's `container` is deliberately not
 * used anywhere: its breakpoint step function caps at 1536px, which is what
 * held the catalog to four columns and left 256px of dead gutter at 2048px.
 *
 * `wide` is two-stepped on purpose. A flat 1800px cap would reach a six-column
 * grid at roughly 1724px, breaking the "five columns at 1440-1799" band; the
 * 1712px step creates a plateau that holds five columns to the top of that
 * band, and the 1792px step unlocks the sixth column exactly at 1800px.
 */
const shellVariants = cva("mx-auto w-full", {
  variants: {
    width: {
      wide: "max-w-[1712px] min-[1800px]:max-w-[1792px]",
      default: "max-w-[1200px]",
      narrow: "max-w-sm",
    },
    pad: {
      none: "px-4",
      default: "px-4 py-4",
      roomy: "px-4 py-8",
    },
  },
  defaultVariants: { width: "default", pad: "default" },
});

export type PageWidth = NonNullable<VariantProps<typeof shellVariants>["width"]>;

/** Offset for sticky side panels: header 48px + its 1px border + a 16px gutter. */
export const STICKY_TOP = "[--sticky-top:calc(var(--header-height)+1.0625rem)]";

export default function PageShell({
  width,
  pad,
  className,
  children,
}: VariantProps<typeof shellVariants> & {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn(shellVariants({ width, pad }), STICKY_TOP, className)}>
      {children}
    </div>
  );
}
