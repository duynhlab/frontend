import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingStateProps {
  message?: string;
  variant?: "default" | "card" | "list";
  count?: number;
}

/**
 * LoadingState — standard loading UI. `card`/`list` variants render skeleton
 * placeholders; the default renders a spinner + label. Never combine a
 * spinner and skeletons for the same region (AGENTS.md).
 */
export default function LoadingState({
  message = "Loading...",
  variant = "default",
  count = 3,
}: LoadingStateProps) {
  if (variant === "card") {
    return (
      <div aria-busy="true" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} aria-hidden="true" className="space-y-2 rounded-xl border bg-card p-3">
            <Skeleton className="h-5 w-2/5" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div aria-busy="true" className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} aria-hidden="true" className="h-9 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
      <Spinner className="size-4" />
      <span>{message}</span>
    </div>
  );
}
