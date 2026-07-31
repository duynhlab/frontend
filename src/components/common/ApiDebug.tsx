/**
 * ApiDebug — standardized API response debug display (dev builds only).
 */
export default function ApiDebug({
  data,
  label = "API Response",
}: {
  data: unknown;
  label?: string;
}) {
  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <details className="mt-3 rounded-md border bg-card p-2 text-xs">
      <summary className="cursor-pointer text-muted-foreground">{label}</summary>
      <pre className="mt-2 overflow-x-auto p-2">{JSON.stringify(data, null, 2)}</pre>
    </details>
  );
}
