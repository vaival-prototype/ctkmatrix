import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import Spinner from "@/components/shared/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CounterpartyChat } from "@/components/counterparty/CounterpartyChat";
import { useClaims } from "@/hooks/useClaims";
import { useAccessTier } from "@/hooks/useAccessTier";
import { Search, Filter, ArrowRightLeft, Building2, GitBranch, Clock, MessageSquare, Sparkles } from "lucide-react";

function humanizeStatus(s = "") {
  return s.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function normalizeCode(s) {
  return (s ?? "").trim().toLowerCase();
}

function statusVariant(s = "") {
  const v = s.toLowerCase();
  if (v.includes("accept") || v.includes("settled") || v.includes("closed")) return "success";
  if (v.includes("dispute") || v.includes("contest") || v.includes("reject")) return "danger";
  if (v.includes("review")) return "warning";
  return "info";
}

const STATUS_FILTERS = ["All", "Negotiating", "Review", "Disputed", "Settled"];

// Reuses the same real status→variant mapping the status badges already render with —
// "Negotiating" is every non-review/disputed/settled status (sent, viewed, negotiation-active,
// settlement-proposed/countered, etc.), not a separate status of its own.
const FILTER_VARIANT = { Negotiating: "info", Review: "warning", Disputed: "danger", Settled: "success" };

// The API claim shape is leaner than the counterparty card needs; adapt it
// and derive a best-effort contact from the recipient company.
function adaptClaim(c) {
  return {
    id: c.id,
    subject: c.title,
    parties: c.participants ?? [c.initiator, c.recipient].filter(Boolean),
    status: c.status,
    liability: c.liability,
    value: c.exposure,
    updated: c.updated,
    contact: {
      name: c.recipient ?? "Counterparty",
      org: c.recipient ?? "",
      phone: c.contactPhone ?? "",
      email: c.contactEmail ?? "",
      available: !!c.contactAvailable,
    },
  };
}

function MatrixCell({ claimId, className, children }) {
  return (
    <Link to={`/claims/${claimId}`} className={`block h-full ${className ?? ""}`}>
      {children}
    </Link>
  );
}

function MatrixFact({ icon: Icon, label, value }) {
  return (
    <div className="rounded-md border border-accent/35 bg-background p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-accent" /> {label}
      </div>
      <div className="mt-1 truncate font-medium text-foreground">{value}</div>
    </div>
  );
}

function ContactCard({ contact, claimId, subject, onChatOpen }) {
  const dotColor = contact.available ? "bg-emerald-500" : "bg-red-500";
  const statusLabel = contact.available ? "Available" : "Unavailable";
  const appointmentSubject = encodeURIComponent(`Appointment request — ${subject}`);
  const appointmentBody = encodeURIComponent(
    `Hi ${contact.name.split(" ")[0]},\n\nI'd like to request an appointment to discuss Claim Matrix ${claimId} (${subject}).\n\nPlease share a few times that work for you.\n\nThanks,`
  );

  return (
    <div className="relative ml-auto flex w-full max-w-[220px] flex-col items-end gap-0.5 rounded-md border bg-background px-2.5 py-1.5 text-right shadow-sm min-w-[200px]">
      <span className={`absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full ring-2 ring-background ${dotColor}`} aria-hidden="true" />
      <button
        type="button"
        className="flex w-full items-center justify-end gap-1.5 text-[13px] font-medium leading-tight hover:text-accent focus:outline-none"
        title={`Chat with ${contact.name} — ${statusLabel}`}
        onClick={() => onChatOpen(claimId)}
      >
        <MessageSquare className="h-3.5 w-3.5 text-accent" />
        <span className="truncate">{contact.name}</span>
      </button>
      <div className="w-full text-right text-[11px] text-muted-foreground leading-tight">{contact.org}</div>
      {contact.phone && (
        <a href={`tel:${contact.phone.replace(/[^\d]/g, "")}`} className="w-full text-right text-[11px] text-muted-foreground hover:text-foreground leading-tight">
          {contact.phone}
        </a>
      )}
      <div className="flex w-full items-center justify-end gap-2">
        <button
          type="button"
          className="text-left text-[11px] text-accent hover:underline leading-tight"
          title={`Chat with ${contact.name}`}
          onClick={() => onChatOpen(claimId)}
        >
          click to chat
        </button>
        {contact.email && (
          <a
            href={`mailto:${contact.email}?subject=${appointmentSubject}&body=${appointmentBody}`}
            className="text-[11px] text-accent hover:underline leading-tight"
            title={`Request an appointment with ${contact.name}`}
          >
            request appointment
          </a>
        )}
      </div>
    </div>
  );
}

export default function Claims() {
  const { data, loading, error } = useClaims();
  const { capabilities } = useAccessTier();
  const [chatOpen, setChatOpen] = useState(false);
  const [chatClaimId, setChatClaimId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Find Matrix - Claim Matrix";
  }, []);

  const claims = (data ?? []).map(adaptClaim);
  const activeClaim = claims.find((c) => c.id === chatClaimId) ?? claims[0];
  const filteredClaims =
    statusFilter === "All" ? claims : claims.filter((c) => statusVariant(c.status) === FILTER_VARIANT[statusFilter]);

  // Live preview of the search box, and what "Find Matrix" actually navigates to — matched
  // against the same claims already loaded for the table below (both by Matrix code and by
  // Auto claim reference), since no separate single-claim lookup endpoint exists yet.
  const trimmedQuery = searchQuery.trim();
  const matchedClaim = trimmedQuery
    ? (data ?? []).find(
        (c) => normalizeCode(c.id) === normalizeCode(trimmedQuery) || normalizeCode(c.autoClaimId) === normalizeCode(trimmedQuery)
      )
    : null;

  function handleFindMatrix() {
    if (!trimmedQuery) return;
    if (!matchedClaim) {
      toast.error(`No claim matrix found for "${trimmedQuery}"`);
      return;
    }
    navigate(`/claims/${encodeURIComponent(matchedClaim.id)}`);
  }

  const handleChatOpen = (claimId) => {
    setChatClaimId(claimId);
    setChatOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Find Matrix"
        subtitle="Search Claim Matrix matrixs created from Claim Toolkit Auto packages"
        actions={
          <>
            <Button variant="outline" size="sm" disabled title="Filtering isn't available yet">
              <Filter className="h-4 w-4" /> Filter <StatusBadge variant="warning"><Sparkles className="h-3 w-3" /> Coming soon</StatusBadge>
            </Button>
            <Button asChild size="sm"><Link to="/new-shared-claim"><ArrowRightLeft className="h-4 w-4" /> Initiate Matrix</Link></Button>
          </>
        }
      />

      <Card className="mb-4 border-accent/60 bg-card shadow-card">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
            <div className="space-y-3">
              <div>
                <div className="text-sm font-semibold text-foreground">Find by Claim Toolkit Auto reference or Claim Matrix matrix</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Operational claims remain in Claim Toolkit Auto. Claim Matrix searches the collaboration matrix created from the Auto package handoff.
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_auto]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="CM-2606-0001"
                    className="pl-9 bg-background"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleFindMatrix()}
                  />
                </div>
                <Button onClick={handleFindMatrix} disabled={!searchQuery.trim()} className="whitespace-nowrap">
                  <Search className="h-4 w-4" /> Find Matrix
                </Button>
                <Button asChild variant="outline" className="whitespace-nowrap">
                  <Link to="/new-shared-claim"><ArrowRightLeft className="h-4 w-4" /> Initiate Matrix</Link>
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <MatrixFact icon={GitBranch} label="Auto claim" value={matchedClaim?.autoClaimId || "—"} />
              <MatrixFact icon={Building2} label="Company" value={matchedClaim?.initiator || "—"} />
              <MatrixFact
                icon={Clock}
                label="Last sync"
                value={matchedClaim?.autoLastSyncedAt ? new Date(matchedClaim.autoLastSyncedAt).toLocaleString() : "—"}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex gap-1 text-xs">
          {STATUS_FILTERS.map((t) => (
            <button
              key={t}
              onClick={() => setStatusFilter(t)}
              className={`px-3 py-1.5 rounded-md ${t === statusFilter ? "bg-accent text-accent-foreground" : "bg-card hover:bg-muted"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <Card className="shadow-card border-destructive/40">
          <CardContent className="p-6 text-sm text-destructive">Failed to load claim matrixs: {error.message}</CardContent>
        </Card>
      ) : claims.length === 0 ? (
        <EmptyState
          title="Data not found"
          body="No claim matrixs are available yet. Shared matrixs created from Claim Toolkit Auto packages will appear here."
          action={
            <Button asChild variant="outline">
              <Link to="/new-shared-claim">Initiate Matrix</Link>
            </Button>
          }
        />
      ) : filteredClaims.length === 0 ? (
        <EmptyState title="No matches" body={`No claim matrixs are in "${statusFilter}" status.`} />
      ) : (
        <Card className="shadow-card border-accent/50 overflow-hidden">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-muted-foreground text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Claim</th>
                  <th className="text-left px-5 py-3 font-medium">Parties</th>
                  <th className="text-left px-5 py-3 font-medium">Liability</th>
                  <th className="text-left px-5 py-3 font-medium">Exposure</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-left px-5 py-3 font-medium">Updated</th>
                  <th className="text-right px-5 py-3 font-medium">Chat</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredClaims.map((c) => (
                  <tr key={c.id} className="cursor-pointer hover:bg-muted/40">
                    <td>
                      <MatrixCell claimId={c.id} className="px-5 py-4">
                        <div className="text-xs font-mono text-muted-foreground">{c.id}</div>
                        <div className="font-medium text-foreground">{c.subject}</div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">Source: Claim Toolkit Auto package</div>
                      </MatrixCell>
                    </td>
                    <td>
                      <MatrixCell claimId={c.id} className="px-5 py-4 text-muted-foreground">
                        {c.parties.join(" ↔ ")}
                      </MatrixCell>
                    </td>
                    <td>
                      <MatrixCell claimId={c.id} className="px-5 py-4 font-medium">
                        {c.liability}
                      </MatrixCell>
                    </td>
                    <td>
                      <MatrixCell claimId={c.id} className="px-5 py-4 font-medium">
                        {c.value}
                      </MatrixCell>
                    </td>
                    <td>
                      <MatrixCell claimId={c.id} className="px-5 py-4">
                        <StatusBadge variant={statusVariant(c.status)}>
                          {humanizeStatus(c.status)}
                        </StatusBadge>
                      </MatrixCell>
                    </td>
                    <td>
                      <MatrixCell claimId={c.id} className="px-5 py-4 text-muted-foreground">
                        {c.updated}
                      </MatrixCell>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {capabilities.chat && (
                        <ContactCard
                          contact={c.contact}
                          claimId={c.id}
                          subject={c.subject}
                          onChatOpen={handleChatOpen}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {activeClaim && (
        <CounterpartyChat
          open={chatOpen}
          onOpenChange={setChatOpen}
          claimId={activeClaim.id}
          subject={activeClaim.subject}
          party={activeClaim.contact}
        />
      )}
    </>
  );
}
