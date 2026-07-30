import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface PageHeaderProps {
  title: string;
  backLink?: string;
  backText?: string;
  /** Dev-harness endpoint label (kept from the original UI). */
  apiLabel?: string;
  actions?: ReactNode;
  children?: ReactNode;
}

/**
 * PageHeader — standard page title with optional back link and actions.
 */
export default function PageHeader({
  title,
  backLink,
  backText = "← Back",
  apiLabel,
  actions,
  children,
}: PageHeaderProps) {
  return (
    <div className="mb-4 space-y-1">
      <div className="flex items-start justify-between gap-4">
        <div>
          {backLink && (
            <Link
              to={backLink}
              className="mb-1 inline-block text-sm text-muted-foreground hover:text-foreground"
            >
              {backText}
            </Link>
          )}
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {apiLabel && (
        <p className="font-mono text-xs text-muted-foreground">{apiLabel}</p>
      )}
      {children}
    </div>
  );
}
