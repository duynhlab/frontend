import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/common/EmptyState";
import PageShell from "@/components/layout/PageShell";

/**
 * NotFoundPage — real 404 for unknown routes (the legacy router silently
 * redirected home, which hid broken links).
 */
export default function NotFoundPage() {
  return (
    <PageShell width="narrow" pad="roomy">
      <EmptyState
        size="sm"
        icon="🧭"
        message="Page not found"
        description="The page you are looking for does not exist or has moved."
      >
        <Button render={<Link to="/">Go home</Link>} />
        <Button variant="outline" render={<Link to="/products">Browse products</Link>} />
      </EmptyState>
    </PageShell>
  );
}
