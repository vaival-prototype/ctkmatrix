import { NavLink } from "react-router-dom";
import { cn } from "@/utils/cn";
import { topNav } from "@/constants/navigation";
import { useAccessTier } from "@/hooks/useAccessTier";

export default function MobileTopNav({ pathname }) {
  const { tierKey } = useAccessTier();
  // Same reasoning as TopNav -- a Level 4 (Claim Party) account only has one
  // place to be, so a single-item nav bar has nothing to offer.
  if (tierKey === "level4") return null;

  return (
    <nav className="flex border-b border-accent/40 bg-card px-4 xl:hidden">
      {topNav.map((item) => {
        const active =
          pathname === item.to ||
          (item.to !== "/dashboard" && pathname.startsWith(item.to));
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={cn(
              "border-r px-4 py-2.5 text-xs font-semibold first:border-l",
              active
                ? "bg-accent text-accent-foreground"
                : "text-foreground hover:bg-muted"
            )}
          >
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
