import { NavLink } from "react-router-dom";
import { cn } from "@/utils/cn";
import { useTopNav } from "@/hooks/useTopNav";

export default function TopNav({ pathname }) {
  const items = useTopNav();
  if (items.length === 0) return null;

  return (
    <nav aria-label="Main" className="hidden xl:flex h-full flex-1 items-center justify-center">
      {items.map((item) => {
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
