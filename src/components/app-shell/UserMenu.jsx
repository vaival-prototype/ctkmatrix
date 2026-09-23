import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";

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

  const handleLogout = async () => {
    await logout();
    navigate("/signin");
  };

  const name = user?.name ?? "Account";
  const role = user?.role ?? "";
  const company = user?.company ?? "";
  const tierLabel = user?.role === "Claim Matrix Admin"
    ? "Admin"
    : ({ level1: "Level 1", level2: "Level 2", level3: "Level 3", level4: "Level 4" }[user?.tier] ?? "");
  const secondary = [role, company].filter(Boolean).join(" · ");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 pl-3 border-l border-primary-foreground/20 cursor-pointer focus:outline-none"
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
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">{name}</p>
            {secondary && <p className="text-xs text-muted-foreground">{secondary}</p>}
            {tierLabel && <p className="text-xs font-medium text-accent">Tier: {tierLabel}</p>}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
