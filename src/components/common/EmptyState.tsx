import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

interface EmptyStateProps {
  message?: string;
  description?: string;
  icon?: ReactNode;
  /** `sm` for states nested inside a Card, where the page already frames them. */
  size?: "default" | "sm";
  className?: string;
  /** Action slot (e.g. a "Browse products" link). */
  children?: ReactNode;
}

/**
 * EmptyState — "no data" display (not an error). Children render as the
 * action slot; the legacy version silently dropped them.
 */
export default function EmptyState({
  message = "No items found",
  description,
  icon = "📦",
  size = "default",
  className,
  children,
}: EmptyStateProps) {
  return (
    <Empty size={size} className={cn("border border-dashed", className)}>
      <EmptyHeader>
        <EmptyMedia variant="default" aria-hidden="true">
          {icon}
        </EmptyMedia>
        <EmptyTitle>{message}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {children && <EmptyContent>{children}</EmptyContent>}
    </Empty>
  );
}
