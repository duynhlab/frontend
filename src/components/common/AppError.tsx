import { AlertCircleIcon } from "lucide-react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { toUserFriendlyError, type AppError as AppErrorShape } from "@/lib/errors";

interface AppErrorProps {
  /** Normalized AppError from the hooks, or a raw string from legacy callers. */
  error: AppErrorShape | string | null;
  endpoint?: string;
  onRetry?: () => void;
}

/**
 * AppError — inline alert for errors the user must read (never a toast).
 * The hooks pass a normalized AppError whose message is already user-friendly.
 */
export default function AppError({ error, endpoint, onRetry }: AppErrorProps) {
  // Strings reaching this component are already user-facing app copy (every
  // API failure is normalized by toAppError upstream) — show them verbatim
  // instead of collapsing unknown-but-friendly copy into the generic message.
  const message =
    typeof error === "string"
      ? error
      : error?.message || toUserFriendlyError(null);

  return (
    <Alert variant="destructive" role="alert">
      <AlertCircleIcon aria-hidden="true" />
      <AlertTitle>{message}</AlertTitle>
      {endpoint && (
        <AlertDescription>
          <span className="font-mono text-xs">Endpoint: {endpoint}</span>
        </AlertDescription>
      )}
      {onRetry && (
        <AlertAction>
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>
            Try again
          </Button>
        </AlertAction>
      )}
    </Alert>
  );
}
