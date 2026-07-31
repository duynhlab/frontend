/**
 * Footer — static app footer, rendered once by AppLayout.
 */
export default function Footer() {
  return (
    <footer className="mt-8 border-t py-3 text-center text-xs text-muted-foreground">
      <p className="flex flex-wrap justify-center gap-x-2">
        <span>E-Commerce • API Test Harness</span>
        <span>UI strictly reflects backend API capabilities</span>
      </p>
    </footer>
  );
}
