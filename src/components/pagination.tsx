import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-3 pt-2"
    >
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft className="size-4" />
        Previous
      </Button>
      <span
        aria-live="polite"
        className="text-[13px] tabular-nums text-muted-foreground"
      >
        Page {page} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Next
        <ChevronRight className="size-4" />
      </Button>
    </nav>
  )
}
