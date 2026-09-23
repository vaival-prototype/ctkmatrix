import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import TopNav from "./TopNav";
import NotificationBell from "./NotificationBell";
import UserMenu from "./UserMenu";
import { useAccessTier } from "@/hooks/useAccessTier";

export default function Header({ pathname }) {
  const { tierKey } = useAccessTier();
  return (
    <header className="h-16 bg-primary text-primary-foreground border-b-4 border-accent flex items-center gap-4 px-6 sticky top-0 z-30">
      {/* Logo */}
      <Link to="/dashboard" className="flex items-center gap-3 pr-5">
        <div className="h-9 w-9 rounded-md bg-accent text-accent-foreground flex items-center justify-center text-sm font-bold">CM</div>
        <span className="hidden xl:inline text-sm font-semibold text-primary-foreground">Claim Matrix</span>
      </Link>

      {/* Desktop top nav */}
      <TopNav pathname={pathname} />

      {/* Onboard button — a company-level admin action, not relevant to a
          single-claim Claim Party account */}
      {tierKey !== "level4" && (
        <Button
          asChild
          size="icon"
          variant="success"
          className="h-10 w-10 shrink-0"
          title="Onboard company"
        >
          <Link to="/companies/onboarding">
            <Plus className="h-5 w-5" />
          </Link>
        </Button>
      )}

      {/* Right side */}
      <div className="ml-auto flex items-center gap-3">
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
