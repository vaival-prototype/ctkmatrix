import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu } from "lucide-react";
import { cn } from "@/utils/cn";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useTopNav } from "@/hooks/useTopNav";
import { useModuleNav } from "@/hooks/useModuleNav";
import { navIcons, isNavItemActive } from "./navIcons";

/**
 * Below the xl breakpoint the desktop top nav is hidden, and below lg the
 * module sidebar is too — so the menu button here is the only way to reach
 * Approvals, Admin, Support etc. on tablets and phones.
 */
export default function MobileTopNav({ pathname }) {
  const items = useTopNav();
  const modules = useModuleNav();
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;

  return (
    <nav aria-label="Main" className="flex items-stretch border-b border-accent/40 bg-card px-2 sm:px-4 xl:hidden">
      <div className="flex min-w-0 flex-1 overflow-x-auto">
        {items.map((item) => {
          const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "shrink-0 whitespace-nowrap border-r px-3 py-2.5 text-xs font-semibold first:border-l sm:px-4",
                active ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-muted"
              )}
            >
              {item.label}
            </NavLink>
          );
        })}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className="ml-2 inline-flex items-center gap-1.5 px-3 text-xs font-semibold text-foreground hover:bg-muted lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" aria-hidden="true" /> Menu
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-72 p-0">
          <SheetHeader className="border-b p-4">
            <SheetTitle>Claim Matrix</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col p-2">
            {modules.map((item) => {
              const Icon = navIcons[item.icon];
              const active = isNavItemActive(item, pathname);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium",
                    active ? "bg-accent/10 text-accent" : "text-foreground hover:bg-muted"
                  )}
                >
                  {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
                  {item.label}
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
