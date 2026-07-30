import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * Named entries in the `--spacing-*` theme namespace must be declared here.
 * tailwind-merge only collapses conflicting classes it can classify, and a
 * bare word like `control` matches none of its built-in value validators — so
 * an unregistered `h-control` survives alongside a call site's `h-auto` and
 * the cascade, not the override, decides the height.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      spacing: [
        "control",
        "control-xs",
        "control-sm",
        "control-lg",
        "touch",
        "header",
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
