import { useState } from "react";
import { NavLink } from "react-router-dom";
import { MenuIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { NavEntry } from "./AppHeader";

interface MobileNavigationProps {
  entries: NavEntry[];
  isAuthenticated: boolean;
  onLogout: () => void;
}

/**
 * MobileNavigation — hamburger + Sheet side panel (focus trap and Escape
 * handling come from the Base UI dialog underneath).
 */
export default function MobileNavigation({
  entries,
  isAuthenticated,
  onLogout,
}: MobileNavigationProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              // 44px hit area inside the 48px bar; the box stays 32px.
              className="relative after:absolute after:-inset-1.5 after:content-['']"
              aria-label="Open menu"
            >
              <MenuIcon aria-hidden="true" />
            </Button>
          }
        />
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <nav aria-label="Main" className="flex flex-col gap-1 px-4">
            {entries.map((entry) => (
              <NavLink
                key={entry.to}
                to={entry.to}
                onClick={close}
                className={({ isActive }) =>
                  cn(
                    "flex min-h-touch items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent",
                    isActive ? "font-semibold text-primary" : "text-foreground",
                  )
                }
              >
                {entry.label}
                {entry.badge !== undefined && entry.badge > 0 && (
                  <Badge className="px-1.5 py-0 text-[0.6875rem]">{entry.badge}</Badge>
                )}
              </NavLink>
            ))}
            {isAuthenticated ? (
              <Button
                type="button"
                variant="ghost"
                className="justify-start px-3"
                onClick={() => {
                  close();
                  onLogout();
                }}
              >
                Logout
              </Button>
            ) : (
              <NavLink
                to="/login"
                onClick={close}
                className="rounded-md px-3 py-2 text-sm hover:bg-accent"
              >
                Login
              </NavLink>
            )}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
