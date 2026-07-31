import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import PageShell from "@/components/layout/PageShell";

/**
 * HomePage — landing page: hero + CTA. No product fetching (that belongs to
 * ProductListPage); the CTA preloads the catalog chunk on user intent.
 */
const preloadProducts = () => {
  void import("../ProductListPage/ProductListPage");
};

export default function HomePage() {
  return (
    <PageShell pad="none">
      <section className="flex flex-col items-center gap-5 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome to <span className="text-primary">DuynhLab</span> 👋
        </h1>
        <p className="max-w-xl text-balance text-muted-foreground">
          Discover our curated collection of products. Browse, compare, and
          find exactly what you need.
        </p>
        <Link
          to="/products"
          className={cn(buttonVariants({ size: "lg" }), "hover:no-underline")}
          onMouseEnter={preloadProducts}
          onFocus={preloadProducts}
        >
          Browse Products →
        </Link>
      </section>
    </PageShell>
  );
}
