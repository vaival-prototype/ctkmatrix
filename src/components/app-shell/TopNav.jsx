import { NavLink } from "react-router-dom";
import { cn } from "@/utils/cn";
import { topNav } from "@/constants/navigation";
import { useAccessTier } from "@/hooks/useAccessTier";

/**
 * "Initiate Matrix" always goes to /new-shared-claim, which picks the origin
 * from the signed-in user's access level (Level 3/CTK Auto can choose Auto
 * or manual entry, Level 2/CTK Compliance is manual-only) and shows its own
 * "you can't initiate from this account" state for Level 1 receive-only
 * accounts — no separate upgrade path exists per Mark's spec. Level 4
 * (Claim Party) accounts are scoped to a single claim, not the whole
 * platform, so they don't get the browse/initiate nav items at all.
 */
export default function TopNav({ pathname }) {
  const { tierKey } = useAccessTier();
  // Level 4 (Claim Party) is scoped to a single claim's dashboard -- with
  // nowhere else to go, a nav bar showing just "Dashboard" is not a real
  // choice, so skip rendering the nav entirely for that tier.
  if (tierKey === "level4") return null;

  return (
    <nav className="hidden xl:flex h-full flex-1 items-center justify-center">
      {topNav.map((item) => {
        const basePath = item.to.split("?")[0];
        const active = pathname === basePath || (basePath !== "/dashboard" && pathname.startsWith(basePath));
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={cn(
              "flex h-full items-center border-l border-primary-foreground/18 px-7 text-xs font-semibold transition-colors last:border-r",
              active
                ? "bg-primary-foreground/10 text-primary-foreground"
                : "text-primary-foreground/78 hover:bg-primary-foreground/8 hover:text-primary-foreground"
            )}
          >
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
