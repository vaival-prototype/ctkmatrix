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
  const { tierKey, capabilities } = useAccessTier();
  // Level 4 (a person in the claim) only ever sees the claims shared with
  // them — no module sidebar. Chat and Ask CTK follow the account's access.
  const isClaimParty = tierKey === "level4";
  const hasAskCtk = [
    "askCtkStateSummary",
    "askCtkCaseSummary",
    "askCtkStatementSummaries",
    "askCtkHistories",
  ].some((key) => capabilities[key]);
  const showChat = !isClaimDetailRoute(pathname) && !!capabilities.chat;
  // Chat sits above Ask CTK, so it only needs the taller inset when both show.
  const sidebarInset = showChat ? "chatAndAskCtk" : hasAskCtk ? "askCtk" : "none";

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
      {!isClaimParty && <Sidebar bottomInset={sidebarInset} />}

      {/* Floating widgets */}
      {showChat && <CollaborationChat />}
      {hasAskCtk && <CTKAssistant pathname={pathname} />}
    </div>
  );
}
