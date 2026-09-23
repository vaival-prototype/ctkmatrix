import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import Spinner from "@/components/shared/Spinner";
import ComingSoon from "@/components/shared/ComingSoon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { CounterpartyChat } from "@/components/counterparty/CounterpartyChat";
import {
  ArrowUpRight,
  FileText,
  MessageSquare,
  Handshake,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  Upload,
  UserPlus,
  ArrowRightLeft,
  Sparkles,
  Calendar,
  MapPin,
} from "lucide-react";
import { useDashboard } from "@/hooks/useDashboard";
import { useClaims } from "@/hooks/useClaims";
import { useAccessTier } from "@/hooks/useAccessTier";
import { useDocuments } from "@/hooks/useDocuments";
import accidentSceneImg from "@/assets/accident-scene.png";

const METRIC_ICONS = {
  "Open Claims": Handshake,
  "Pending Claims": UserPlus,
  "Open Negotiations": MessageSquare,
  "Avg. Settlement Time": Clock,
};

const ACTIVITY_ICON_RULES = [
  [/settl|propos/i, Handshake, "text-accent"],
  [/upload|document/i, Upload, "text-info"],
  [/invit|join/i, UserPlus, "text-accent"],
  [/liab|updat|split/i, AlertCircle, "text-warning"],
  [/settled|closed|accept/i, CheckCircle2, "text-accent"],
];

function resolveActivity(a) {
  if (a.icon) return a;
  const match = ACTIVITY_ICON_RULES.find(([re]) => re.test(a.action || ""));
  return { ...a, icon: match ? match[1] : MessageSquare, color: match ? match[2] : "text-muted-foreground" };
}

const STATUS_TONES = {
  "Pending review": "warning",
  Acknowledged: "success",
  Shared: "info",
};

function humanizeStatus(s = "") {
  return s.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

// Same real status->variant mapping StatusBadge renders with elsewhere (Claims.jsx).
function statusVariant(s = "") {
  const v = s.toLowerCase();
  if (v.includes("accept") || v.includes("settled") || v.includes("closed")) return "success";
  if (v.includes("dispute") || v.includes("contest") || v.includes("reject")) return "danger";
  if (v.includes("review")) return "warning";
  return "info";
}

// The raw GET /claims record is leaner than this row template needs (no
// `subject`/`statusLabel`/`contact`) — adapt it the same way Claims.jsx does,
// so Open Claims rows show real content instead of mostly-empty rows.
function adaptDashboardClaim(c) {
  return {
    ...c,
    subject: c.title,
    statusLabel: humanizeStatus(c.status),
    contact: {
      name: c.recipient ?? "Counterparty",
      org: c.recipient ?? "",
      phone: c.contactPhone ?? "",
      email: c.contactEmail ?? "",
      available: !!c.contactAvailable,
    },
  };
}

function SettlementBar({ label, value, display, tone = "success" }) {
  const color = tone === "info" ? "bg-info" : tone === "danger" ? "bg-destructive" : "bg-accent";
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{display}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ContactCard({ contact, claimId, subject, onChatOpen }) {
  const name = contact?.name ?? "Contact";
  const org = contact?.org ?? "";
  const phone = contact?.phone ?? "";
  const email = contact?.email ?? "";
  const dotColor = contact?.available ? "bg-emerald-500" : "bg-red-500";
  const statusLabel = contact?.available ? "Available" : "Unavailable";
  const appointmentSubject = encodeURIComponent(`Appointment request — ${subject ?? claimId}`);
  const appointmentBody = encodeURIComponent(
    `Hi ${name.split(" ")[0]},\n\nI'd like to request an appointment to discuss Claim Matrix ${claimId} (${subject ?? ""}).\n\nPlease share a few times that work for you.\n\nThanks,`
  );

  return (
    <div className="relative ml-auto flex w-full max-w-[220px] flex-col items-end gap-0.5 rounded-md border bg-background px-2.5 py-1.5 text-right shadow-sm min-w-[200px]">
      <span className={`absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full ring-2 ring-background ${dotColor}`} aria-hidden="true" />
      <button
        type="button"
        className="flex w-full items-center justify-end gap-1.5 text-[13px] font-medium leading-tight hover:text-accent focus:outline-none"
        title={`Chat with ${name} — ${statusLabel}`}
        onClick={() => onChatOpen(claimId)}
      >
        <MessageSquare className="h-3.5 w-3.5 text-accent" />
        <span className="truncate">{name}</span>
      </button>
      {org && <div className="w-full text-right text-[11px] text-muted-foreground leading-tight">{org}</div>}
      {phone && (
        <a href={`tel:${phone.replace(/[^\d]/g, "")}`} className="w-full text-right text-[11px] text-muted-foreground hover:text-foreground leading-tight">
          {phone}
        </a>
      )}
      <div className="flex w-full items-center justify-end gap-2">
        <button
          type="button"
          className="text-left text-[11px] text-accent hover:underline leading-tight"
          title={`Chat with ${name}`}
          onClick={() => onChatOpen(claimId)}
        >
          click to chat
        </button>
        {email && (
          <a
            href={`mailto:${email}?subject=${appointmentSubject}&body=${appointmentBody}`}
            className="text-[11px] text-accent hover:underline leading-tight"
            title={`Request an appointment with ${name}`}
          >
            request appointment
          </a>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data, loading } = useDashboard();
  // "Open Claims" is sourced from GET /claims (the canonical claims list),
  // not the /dashboard aggregate. Other cards stay on /dashboard.
  const { data: claimsData, loading: claimsLoading } = useClaims();
  const { capabilities } = useAccessTier();
  const { data: documentsData } = useDocuments();
  const [chatOpen, setChatOpen] = useState(false);
  const [chatClaimId, setChatClaimId] = useState(null);

  useEffect(() => {
    document.title = "Matrix By Claim Toolkit — Claim Matrix";
  }, []);

  // Live data only — no dummy fallbacks. Missing sections show "Data not found".
  const metrics = (data?.metrics ?? []).map((m) => ({
    ...m,
    icon: m.icon ?? METRIC_ICONS[m.label] ?? Handshake,
  }));
  // "Open" = a claim matrix that was successfully created in the Matrix DB and hasn't
  // been closed yet — matches the backend's CountOpenAsync() (ClosedAt IS NULL).
  // Show a summary subset here; the "View all" link opens the full /claims page.
  const claims = (claimsData ?? []).filter((c) => c.status !== "closed").slice(0, 5).map(adaptDashboardClaim);
  const activity = (data?.activity ?? []).map(resolveActivity);
  const notifications = data?.notifications ?? [];
  const settlement = Array.isArray(data?.settlement) ? data.settlement : null;
  const documents = (documentsData ?? []).slice(0, 3);

  const activeClaim = claims.find((c) => c.id === chatClaimId) ?? claims[0] ?? null;

  const handleChatOpen = (claimId) => {
    setChatClaimId(claimId);
    setChatOpen(true);
  };

  if (loading || claimsLoading) {
    return (
      <div className="p-6">
        <Spinner />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Matrix By Claim Toolkit"
        actions={
          <>
            <Button variant="outline" size="sm" disabled title="Export isn't available yet">
              Export <StatusBadge variant="warning"><Sparkles className="h-3 w-3" /> Coming soon</StatusBadge>
            </Button>
            <Button asChild size="sm"><Link to="/new-shared-claim"><ArrowRightLeft className="h-4 w-4" /> Initiate Matrix</Link></Button>
          </>
        }
      />

      <Card className="shadow-card border-accent/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Open Claims</CardTitle>
          <Button asChild variant="ghost" size="sm" className="text-accent">
            <Link to="/claims">View all <ArrowUpRight className="h-3.5 w-3.5" /></Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {claims.length === 0 ? (
            <div className="p-6">
              <EmptyState title="Data not found" body="No open claims are available from the server yet." />
            </div>
          ) : (
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
                {claims.map((c) => {
                  const partyNames = Array.isArray(c.participants) ? c.participants : [c.initiator, c.recipient].filter(Boolean);
                  return (
                    <tr key={c.id} className="cursor-pointer hover:bg-muted/40">
                      <td>
                        <Link to={`/claims/${c.id}`} className="block h-full px-5 py-4">
                          <div className="text-xs font-mono text-muted-foreground">{c.id}</div>
                          <div className="font-medium text-foreground">{c.subject ?? c.title}</div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">Source: Claim Toolkit Auto package</div>
                        </Link>
                      </td>
                      <td>
                        <Link to={`/claims/${c.id}`} className="block h-full px-5 py-4 text-muted-foreground">
                          {partyNames.join(" ↔ ")}
                        </Link>
                      </td>
                      <td>
                        <Link to={`/claims/${c.id}`} className="block h-full px-5 py-4 font-medium">
                          {c.liability}
                        </Link>
                      </td>
                      <td>
                        <Link to={`/claims/${c.id}`} className="block h-full px-5 py-4 font-medium">
                          {c.exposure}
                        </Link>
                      </td>
                      <td>
                        <Link to={`/claims/${c.id}`} className="block h-full px-5 py-4">
                          <StatusBadge variant={statusVariant(c.status)}>{c.statusLabel}</StatusBadge>
                        </Link>
                      </td>
                      <td>
                        <Link to={`/claims/${c.id}`} className="block h-full px-5 py-4 text-muted-foreground">
                          {c.updated}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {c.contact && capabilities.chat && (
                          <ContactCard
                            contact={c.contact}
                            claimId={c.id}
                            subject={c.subject ?? c.title}
                            onChatOpen={handleChatOpen}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {metrics.length === 0 ? (
          <div className="col-span-2 lg:col-span-4">
            <EmptyState title="Data not found" body="No dashboard metrics are available yet." />
          </div>
        ) : (
          metrics.map((m) => {
            const Icon = m.icon;
            const Trend = m.trend === "up" ? TrendingUp : TrendingDown;
            const trendColor = m.trend === "up" ? "text-accent" : "text-muted-foreground";
            // All metric tiles now have real (mock) data behind them.
            const isLive = true;
            const tile = (
              <>
                <div className="flex items-start justify-between">
                  <div className="text-sm text-muted-foreground">{m.label}</div>
                  <div className="h-8 w-8 rounded-md bg-primary/5 text-primary flex items-center justify-center">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <div className="text-2xl font-semibold">{m.value}</div>
                  {m.delta && (
                    <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
                      <Trend className="h-3 w-3" /> {m.delta}
                    </div>
                  )}
                </div>
              </>
            );
            return (
              <Card key={m.label} className="shadow-card border-accent/50">
                <CardContent className="p-5">
                  {isLive ? tile : <ComingSoon>{tile}</ComingSoon>}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
        <Card className="xl:col-span-2 shadow-card border-accent/50">
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <EmptyState title="Data not found" body="No recent activity to show." />
            ) : (
              <ol className="relative border-l border-border/70 ml-2 space-y-5">
                {activity.map((a, i) => {
                  const Icon = a.icon;
                  return (
                    <li key={i} className="ml-6">
                      <span className={`absolute -left-[11px] flex h-5 w-5 items-center justify-center rounded-full bg-card border ${a.color}`}>
                        <Icon className="h-3 w-3" />
                      </span>
                      <div className="text-sm">
                        <span className="font-medium">{a.who}</span>{" "}
                        {a.org && <span className="text-muted-foreground">({a.org})</span>}{" "}
                        {a.action}{" "}
                        <span className="font-mono text-xs text-accent">{a.target}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{a.time}</div>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card border-accent/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Notifications</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-accent">
              <Link to="/notifications">All <ArrowUpRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <EmptyState title="Data not found" body="No notifications yet." />
            ) : (
              notifications.map((n, i) => (
                <div key={n.id ?? n.title ?? i} className="flex gap-3 p-3 rounded-lg hover:bg-muted/40">
                  <div className="h-2 w-2 mt-2 rounded-full bg-accent" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{n.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{n.time}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card border-accent/50">
          <CardHeader>
            <CardTitle className="text-base">Settlement Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            {settlement && settlement.length > 0 ? (
              settlement.map((s, i) => (
                <SettlementBar key={s.label ?? i} label={s.label} value={s.value} display={s.display} tone={s.tone} />
              ))
            ) : (
              <EmptyState title="Data not found" body="Settlement metrics are not available yet." />
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2 shadow-card border-accent/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Documents</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-accent">
              <Link to="/documents">Open library <ArrowUpRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {documents.length === 0 ? (
              <div className="md:col-span-3">
                <EmptyState title="Data not found" body="No documents are available yet." />
              </div>
            ) : (
              documents.map((d) => (
                <div key={d.id ?? d.name} className="flex items-start gap-3 p-4 rounded-lg border bg-background hover:shadow-card transition-shadow">
                  <div className="h-10 w-10 rounded-md bg-primary/5 text-primary flex items-center justify-center">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{d.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 font-mono">{d.matrixId ?? ""}</div>
                    <div className="text-xs text-muted-foreground">{d.owner ?? ""}</div>
                    {d.status && (
                      <div className="mt-2"><StatusBadge variant={STATUS_TONES[d.status] ?? "info"}>{d.status}</StatusBadge></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {activeClaim && (
        <CounterpartyChat
          open={chatOpen}
          onOpenChange={setChatOpen}
          claimId={activeClaim.id}
          subject={activeClaim.subject ?? activeClaim.title}
          party={activeClaim.contact}
        />
      )}
    </>
  );
}
