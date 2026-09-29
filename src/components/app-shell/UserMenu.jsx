import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpCircle, LogOut, Mail, RotateCcw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ResetDemoDialog from "@/components/shared/ResetDemoDialog";
import { useAuth } from "@/context/AuthContext";
import { useAccessTier } from "@/hooks/useAccessTier";

function initialsOf(name = "") {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export default function UserMenu() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { tierLabel, capabilities } = useAccessTier();
  const [resetOpen, setResetOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/signin");
  };

  const name = user?.name ?? "Account";
  const role = user?.role ?? "";
  const company = user?.company ?? "";
  const secondary = [role, company].filter(Boolean).join(" · ");

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 pl-3 border-l border-primary-foreground/20 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/60 rounded-sm"
            aria-label={`Account menu for ${name}`}
          >
            <div className="h-8 w-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-semibold">
              {initialsOf(name)}
            </div>
            <div className="leading-tight hidden sm:block text-left">
              <div className="text-sm font-medium">{name}</div>
              <div className="text-[11px] text-primary-foreground/65">{tierLabel || role}</div>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">{name}</p>
              {secondary && <p className="text-xs text-muted-foreground">{secondary}</p>}
              {tierLabel && <p className="text-xs font-medium text-accent">Account: {tierLabel}</p>}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {capabilities.requestUpgrade && (
            <DropdownMenuItem onClick={() => navigate("/upgrade")}>
              <ArrowUpCircle className="h-4 w-4" />
              Request upgrade
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => navigate("/demo-inbox")}>
            <Mail className="h-4 w-4" />
            Demo inbox
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setResetOpen(true)}>
            <RotateCcw className="h-4 w-4" />
            Reset demo data
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
            <LogOut className="h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ResetDemoDialog open={resetOpen} onOpenChange={setResetOpen} />
    </>
  );
}
