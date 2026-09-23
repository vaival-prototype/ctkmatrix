import { useState } from "react";
import { ChevronLeft, ChevronRight, Mail, MessageSquare, Users } from "lucide-react";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/button";
import { CounterpartyChat } from "@/components/counterparty/CounterpartyChat";

// Embedded, real-data sibling of CollaborationChat's floating rolodex — this one is scoped
// to a single claim's real participant companies (ParticipantDetailDto), not the global
// floating widget's hardcoded demo contacts. Company-level data only: no person name and no
// phone exist on ParticipantDetailDto, so those are intentionally not shown here (rather
// than fabricated). The presence dot is derived from invitationStatus as an approximation —
// Matrix has no real online/offline presence concept. "click to chat" opens a Matrix-logged
// chat panel scoped to this claim and the selected participant company.
function presenceVariant(invitationStatus) {
  if (invitationStatus === "Accepted") return "bg-emerald-500";
  if (invitationStatus === "Pending") return "bg-warning";
  return "bg-muted-foreground";
}

export default function ClaimContactRolodex({ participants, claimId }) {
  const [index, setIndex] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const list = Array.isArray(participants) ? participants : [];
  if (list.length === 0) return null;

  const safeIndex = Math.min(index, list.length - 1);
  const contact = list[safeIndex];
  const initials = (contact.company || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  const go = (dir) => setIndex((i) => Math.max(0, Math.min(list.length - 1, i + dir)));

  const chatParty = {
    name: contact.company || "Participant company",
    org: contact.company || "",
    role: contact.contactRole || contact.role || "",
    phone: "",
    email: contact.contactEmail || "",
  };

  return (
    <div className="w-[min(320px,calc(100vw-2rem))] overflow-hidden rounded-md border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Chat Rolodex &middot; {list.length} {list.length === 1 ? "contact" : "contacts"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            aria-label="Previous contact"
            disabled={safeIndex === 0}
            onClick={() => go(-1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            aria-label="Next contact"
            disabled={safeIndex === list.length - 1}
            onClick={() => go(1)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="p-3">
        <div className="relative rounded-md border bg-background p-2.5">
          <span
            className={cn(
              "absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full ring-2 ring-background",
              presenceVariant(contact.invitationStatus)
            )}
            aria-hidden
          />
          <div className="flex items-start gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium leading-tight">{contact.company}</div>
              <div className="truncate text-[11px] text-muted-foreground leading-tight">
                {contact.role}
                {contact.contactRole ? ` · ${contact.contactRole}` : ""}
              </div>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={() => setChatOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              <MessageSquare className="h-3.5 w-3.5" /> click to chat
            </button>
            {contact.contactEmail && (
              <a
                href={`mailto:${contact.contactEmail}`}
                className="text-muted-foreground hover:text-accent"
                title={contact.contactEmail}
              >
                <Mail className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </div>

      <CounterpartyChat
        open={chatOpen}
        onOpenChange={setChatOpen}
        claimId={claimId}
        subject={`Matrix ${claimId}`}
        party={chatParty}
      />
    </div>
  );
}
