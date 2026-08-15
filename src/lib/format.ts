const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

/**
 * Money → a display string, e.g. 1999.9 → "$1,999.90".
 *
 * The storefront's APIs answer in major units (dollars), unlike the Backoffice
 * which reads the services' int64 minor units directly. `—` for a missing or
 * unparseable value so a gap never renders as "$0.00".
 */
export function formatMoney(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : value
  if (n == null || Number.isNaN(n)) return '—'
  return currency.format(n)
}

const dateTime = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : dateTime.format(d)
}

const date = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : date.format(d)
}

/**
 * A stable hue for a product with no image.
 *
 * The catalog has no image URLs — product-service does not store one — so a
 * placeholder is the honest answer, not a stock photo of something the shop
 * does not sell. Deriving the hue from the name keeps each product visually
 * identifiable across the grid, the cart, and the order it ends up in.
 */
export function productHue(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % 360
}

/** Initials for the placeholder tile — first letter of up to two words. */
export function productInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}
