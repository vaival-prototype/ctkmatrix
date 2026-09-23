import { useLocation } from "react-router-dom";
import Header from "./Header";
import MobileTopNav from "./MobileTopNav";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import CollaborationChat from "@/components/chat/CollaborationChat";
import CTKAssistant from "@/components/chat/CTKAssistant";
import { useAccessTier } from "@/hooks/useAccessTier";

// The Claim Detail page (/claims/:claimId) embeds its own real-data contact rolodex in its
// header — the global floating one (fake demo contacts) would be a confusing duplicate there.
const isClaimDetailRoute = (pathname) => /^\/claims\/[^/]+$/.test(pathname);

export default function AppShell({ children }) {
  const { pathname } = useLocation();
  const { tierKey } = useAccessTier();
  // Level 4 (Claim Party) accounts are scoped to a single claim, not the
  // whole platform — the module sidebar (Auto/Compliance/Audit/Claim
  // Management/Admin/Demo) and the global chat widget don't apply to them.
  const isClaimParty = tierKey === "level4";

  return (
    <div className="flex min-h-screen bg-background">
      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header pathname={pathname} />
        <MobileTopNav pathname={pathname} />
        <main className="flex-1 p-4 lg:p-5">{children}</main>
        <Footer />
      </div>

      {/* Right sidebar */}
      {!isClaimParty && <Sidebar />}

      {/* Floating widgets */}
      {!isClaimDetailRoute(pathname) && !isClaimParty && <CollaborationChat />}
      <CTKAssistant pathname={pathname} />
    </div>
  );
}
