import type { ReactNode } from "react";
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
  children,
}: EmptyStateProps) {
  return (
    <Empty className="border border-dashed">
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
