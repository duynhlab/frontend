import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * `flex-1` is deliberately absent: every call site's parent is a block
 * element, so it never stretched anything, and its only real effect was to
 * look like the reason these panels were tall. The height is a floor
 * (`--empty-min`) with `justify-center`, so short states stay a predictable
 * size instead of collapsing onto their text.
 */
function Empty({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="empty"
      data-size={size}
      className={cn(
        "flex w-full min-w-0 flex-col items-center justify-center gap-(--empty-gap) rounded-xl border-dashed p-(--empty-spacing) text-center text-balance min-h-(--empty-min)",
        "[--empty-gap:--spacing(3)] [--empty-min:--spacing(24)] [--empty-spacing:--spacing(4)]",
        "data-[size=sm]:[--empty-gap:--spacing(2)] data-[size=sm]:[--empty-min:--spacing(20)] data-[size=sm]:[--empty-spacing:--spacing(3)]",
        className
      )}
      {...props}
    />
  )
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-header"
      className={cn("flex max-w-sm flex-col items-center gap-2", className)}
      {...props}
    />
  )
}

const emptyMediaVariants = cva(
  "flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Sized explicitly: the default slot holds a bare emoji, which
        // otherwise inherits whatever line box its parent happens to have.
        default: "bg-transparent text-xl leading-none",
        icon: "flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function EmptyMedia({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) {
  return (
    <div
      data-slot="empty-icon"
      data-variant={variant}
      className={cn(emptyMediaVariants({ variant, className }))}
      {...props}
    />
  )
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-title"
      className={cn(
        "font-heading text-sm font-medium tracking-tight",
        className
      )}
      {...props}
    />
  )
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <div
      data-slot="empty-description"
      className={cn(
        "text-sm/normal text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
        className
      )}
      {...props}
    />
  )
}

function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-content"
      className={cn(
        // Row, not column: every call site puts one or two buttons here, and
        // stacking them was the single largest contributor to empty-state
        // height. `flex-wrap` keeps two actions side by side down to 360px.
        "flex w-full max-w-sm min-w-0 flex-row flex-wrap items-center justify-center gap-2 text-sm text-balance",
        className
      )}
      {...props}
    />
  )
}

export {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
}
