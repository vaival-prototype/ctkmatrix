import { Link, useLocation } from "react-router-dom";
import {
  Car,
  ClipboardCheck,
  ClipboardList,
  FileSearch,
  ShieldCheck,
  Route,
  HelpCircle,
  Handshake,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { moduleNav, APP_VERSION } from "@/constants/navigation";
import { useAccessTier } from "@/hooks/useAccessTier";
import { useAuth } from "@/context/AuthContext";

const iconMap = {
  Car,
  ClipboardCheck,
  ClipboardList,
  FileSearch,
  ShieldCheck,
  Route,
  HelpCircle,
  Handshake,
};

// Which module tiles a given access level / role gets to see. Level 4 (Claim
// Party) never reaches this component at all -- AppShell hides the whole
// Sidebar for them -- so no case is needed for it here.
function visibleModuleNav(moduleNav, tierKey, isAdmin) {
  return moduleNav.filter((item) => {
    if (isAdmin) return true;
    switch (item.to) {
      case "/claims":
        // Auto Liability -- CTK Auto accounts only.
        return tierKey === "level3";
      case "/compliance-matrix-entry":
        // Compliance -- CTK Compliance accounts only.
        return tierKey === "level2";
      case "/audit-matrix-entry":
        // Audit -- legacy demo page, no longer a real Matrix tier.
        return false;
      case "/dashboard":
        // Claim Matrix -- everyone.
        return true;
      case "/claim-management":
        // Claim Management -- company-level tooling, not for receive-only accounts.
        return tierKey === "level2" || tierKey === "level3";
      case "/admin/company-enablement":
        // Admin -- admin only.
        return false;
      case "/demo":
        // Demo Map -- admin only.
        return false;
      case "/settings":
        // Support -- everyone.
        return true;
      default:
        return true;
    }
  });
}

export default function Sidebar() {
  const { pathname } = useLocation();
  const { tierKey } = useAccessTier();
  const { user } = useAuth();
  const isAdmin = user?.role === "Claim Matrix Admin";
  const visibleNav = visibleModuleNav(moduleNav, tierKey, isAdmin);

  return (
    <aside className="hidden lg:flex w-28 shrink-0 flex-col border-l border-primary/20 bg-primary text-primary-foreground">
      {/* CM Matrix badge */}
      <Link
        to="/dashboard"
        className="flex h-16 items-center justify-center border-b border-primary-foreground/10 px-2 hover:bg-primary-foreground/5 transition-colors"
      >
        <div className="text-center leading-tight">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-sm bg-accent text-accent-foreground shadow-sm ring-1 ring-primary-foreground/15">
            CM
          </div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground/65">
            Matrix
          </div>
        </div>
      </Link>

      {/* Module navigation */}
      <nav className="flex-1 overflow-y-auto pt-3">
        {visibleNav.map((item, _idx, arr) => {
          const otherMatches = arr.filter(
            (o) => o !== item && (pathname === o.to || pathname.startsWith(o.to + "/"))
          );
          let active;
          if (item.label === "Claim Matrix") {
            active = otherMatches.length === 0;
          } else {
            active = pathname === item.to || pathname.startsWith(item.to + "/");
          }
          const Icon = iconMap[item.icon];
          return (
            <Link
              key={item.to}
              to={item.to}
              title={item.label}
              className={cn(
                "relative flex min-h-[5.75rem] flex-col items-center justify-center gap-1.5 border-b border-primary-foreground/10 px-1.5 py-2 text-center transition-colors",
                active
                  ? "bg-primary-foreground/8 text-primary-foreground"
                  : "text-primary-foreground/72 hover:bg-primary-foreground/10 hover:text-primary-foreground"
              )}
            >
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-sm bg-accent text-accent-foreground shadow-sm ring-1 ring-primary-foreground/15",
                  active && "ring-2 ring-primary-foreground/45"
                )}
              >
                {Icon && <Icon className="h-6 w-6 stroke-[1.8]" />}
              </span>
              <span className="max-w-[5.75rem] text-[10px] font-semibold leading-tight text-primary-foreground">
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
