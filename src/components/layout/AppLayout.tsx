import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/toast";
import Footer from "@/components/common/Footer";
import AppHeader from "./AppHeader";

/**
 * AppLayout — sticky header, main content area, footer, and the single
 * application <Toaster /> (AGENTS.md: mount exactly one).
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1">{children}</main>
      <Footer />
      <Toaster timeout={3500} />
    </div>
  );
}
