import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import type { AppError } from "@/lib/errors";

/**
 * Maps backend field errors onto React Hook Form fields. Anything that does
 * not match a known field goes to `root.server`, which forms render as an
 * inline alert (never a toast — form errors are actionable).
 *
 * Returns true when at least one FIELD error was applied.
 */
export function applyServerErrors<T extends FieldValues>(
  error: AppError,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): boolean {
  let applied = false;
  const fieldErrors = error.fieldErrors;
  if (fieldErrors) {
    for (const [name, message] of Object.entries(fieldErrors)) {
      if ((fields as readonly string[]).includes(name)) {
        setError(name as Path<T>, { type: "server", message });
        applied = true;
      }
    }
  }
  if (!applied) {
    setError("root.server" as Path<T>, {
      type: "server",
      message: error.message,
    });
  }
  return applied;
}
