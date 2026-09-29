import { Link, useLocation } from "react-router-dom";
import { cn } from "@/utils/cn";
import { APP_VERSION } from "@/constants/navigation";
import { useModuleNav } from "@/hooks/useModuleNav";
import { navIcons, isNavItemActive } from "./navIcons";

// Room kept free below the last tile for the floating buttons that sit over
// this column (Chat and/or Ask CTK), so scrolling the page brings every tile
// out from under them.
const BOTTOM_INSET = {
  none: "",
  askCtk: "lg:pb-20",
  chatAndAskCtk: "lg:pb-36",
};

export default function Sidebar({ bottomInset = "none" }) {
  const { pathname } = useLocation();
  const visibleNav = useModuleNav();

  return (
    <aside
      className={cn(
        "hidden lg:flex w-28 shrink-0 flex-col border-l border-primary/20 bg-primary text-primary-foreground",
        BOTTOM_INSET[bottomInset]
      )}
    >
      {/* CM Matrix badge */}
      <Link
        to="/dashboard"
        className="flex h-16 items-center justify-center border-b border-primary-foreground/10 px-2 hover:bg-primary-foreground/5 transition-colors"
      >
        <div className="text-center leading-tight">
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-sm bg-accent text-accent-foreground shadow-sm ring-1 ring-primary-foreground/15">
            CM
          </div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground/65">
            Matrix
          </div>
        </div>
      </Link>

      {/* Module navigation */}
      <nav className="flex-1 pt-3">
        {visibleNav.map((item) => {
          const active = isNavItemActive(item, pathname);
          const Icon = navIcons[item.icon];
          return (
            <Link
              key={item.to}
              to={item.to}
              title={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-[4.5rem] flex-col items-center justify-center gap-1 border-b border-primary-foreground/10 px-1.5 py-2 text-center transition-colors",
                active
                  ? "bg-primary-foreground/8 text-primary-foreground"
                  : "text-primary-foreground/72 hover:bg-primary-foreground/10 hover:text-primary-foreground"
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-sm bg-accent text-accent-foreground shadow-sm ring-1 ring-primary-foreground/15",
                  active && "ring-2 ring-primary-foreground/45"
                )}
              >
                {Icon && <Icon className="h-5 w-5 stroke-[1.8]" />}
              </span>
              <span className="max-w-[5.75rem] text-[9px] font-semibold leading-tight text-primary-foreground">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Powered by footer */}
      <div className="border-t border-primary-foreground/10 px-3 py-3 text-center text-[10px] leading-relaxed text-primary-foreground/60">
        <div>
          Powered by{" "}
          <span className="font-medium text-primary-foreground">
            Claim Toolkit
          </span>
        </div>
        <div className="font-mono text-[9px] text-primary-foreground/45">
          {APP_VERSION}
        </div>
      </div>
    </aside>
  );
}
