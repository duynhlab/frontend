/**
 * Format a number as USD currency, e.g. 1999.9 → "$1,999.90".
 * Single source of truth so unit prices and totals render consistently
 * (no more "$19.9" next to "$19.90") with thousands separators.
 */
const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatCurrency(
  value: number | string | null | undefined,
): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (n == null || Number.isNaN(n)) return "—";
  return formatter.format(n);
}
