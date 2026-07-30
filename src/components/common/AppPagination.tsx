import { Button } from "@/components/ui/button";

interface AppPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Accessible name of the nav landmark. */
  label?: string;
}

/**
 * AppPagination — Previous/Next pagination controls.
 * The aria-labels ("Product pagination", "Go to previous/next page") are a
 * stable contract the E2E suite locates by — do not rename casually.
 */
export default function AppPagination({
  currentPage,
  totalPages,
  onPageChange,
  label = "Product pagination",
}: AppPaginationProps) {
  return (
    <nav
      aria-label={label}
      className="mt-6 flex items-center justify-center gap-4"
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Go to previous page"
      >
        ← Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Go to next page"
      >
        Next →
      </Button>
    </nav>
  );
}
