import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCollaborationModes, getSystemBoundaries } from "@/services/adminService";
import { pickList } from "@/services/api";
import { prototypeStates } from "@/data/mock";
import { ArrowRight, CheckCircle2, ClipboardCheck, Layers, LogIn, Route as RouteIcon } from "lucide-react";

// Static walkthrough scaffolding (UI copy, not API-backed data). Links point at
// CM-2606-0001 / inv-3312-harborlegal — the real seeded demo matrix (see
// 02_ClaimMatrix_DummyData_Seed.sql + 05_ClaimMatrix_Demo_Claim_Seed.sql), not
// the old prototype's CM-2406-0148 mock id, which no seed script creates.
const demoSteps = [
  { label: "Enter from Auto Liability dashboard", to: "/product/auto", note: "Adjuster is already inside Claim Toolkit Auto; the Claim Matrix widget (replacing Loss Location Finder) is the entry point, not a separate login.", proof: "Embedded Auto dashboard widget" },
  { label: "Enter from Compliance dashboard", to: "/product/compliance", note: "Same idea for a CTK Compliance user -- Claim Matrix widget added to the existing dashboard's right column.", proof: "Embedded Compliance dashboard widget" },
  { label: "Start as Claim Toolkit adjuster", to: "/dashboard", note: "Operational user opens Claim Matrix.", proof: "Dashboard, active matrixs, notifications" },
  { label: "Review Claim Toolkit Auto package", to: "/new-shared-claim", note: "Auto has sent selected claim documents and metadata; Claim Matrix scopes recipients and sharing.", proof: "Auto handoff wizard" },
  { label: "Open Matrix", to: "/claims/CM-2606-0001", note: "Claim Matrix case/matrix record with participants, documents, audit, and negotiation.", proof: "Complete case object" },
  { label: "Invite or grant access", to: "/invitations", note: "System checks existing user, grants access, or sends registration invite.", proof: "Invitation resolution branch" },
  { label: "Recipient invitation landing", to: "/invitations/inv-3312-harborlegal", note: "External recipient sees scoped access details.", proof: "Secure invite page" },
  { label: "External registration", to: "/accept-invite", note: "Claim Matrix-only user creates local profile and lands in the invited matrix.", proof: "Local user creation" },
  { label: "Structured response", to: "/claims/CM-2606-0001/respond", note: "Guided liability dispute instead of free text only.", proof: "Legal traceability" },
  { label: "Documents and metadata", to: "/claims/CM-2606-0001", note: "Use Documents tab to show structured data as source of truth and PDF as output artifact.", proof: "Structured data + generated PDF" },
  { label: "User management and RBAC", to: "/admin/users", note: "Click a user, edit memberships, and show role permission matrix.", proof: "RBAC matrix" },
  { label: "Notification settings", to: "/settings/notifications", note: "Show email, in-app, and Claim Toolkit / Auto notification channels.", proof: "Event-channel matrix" },
  { label: "Settlement capture", to: "/claims/CM-2606-0001/settlement", note: "Structured outcome for audit, compliance, and future analytics.", proof: "Offer/counter/final outcome" },
  { label: "Close matrix", to: "/claims/CM-2606-0001/close", note: "Final review before read-only archive.", proof: "Closure checklist" },
];

const reviewChecklist = [
  "Claim Toolkit remains system of record", "Claim Matrix case/matrix record is clear", "Auto package import story is visible",
  "Invite existing vs new user branch is visible", "External registration lands in matrix", "User management supports multi-org memberships",
  "RBAC matrix covers Yes / No / Maybe permissions", "Notifications cover email, in-app, and Auto",
  "Structured response avoids free-form-only negotiation", "Documents show structured data before PDF",
  "Settlement outcome is captured structurally", "Ask CTK is available across pages",
];

function StoryStep({ title, body }) {
  return (
    <div className="rounded-md border border-accent/35 bg-background p-3">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</div>
    </div>
  );
}

export default function Demo() {
  const [boundaries, setBoundaries] = useState([]);
  const [modes, setModes] = useState([]);

  useEffect(() => {
    let active = true;
    getSystemBoundaries()
      .then((res) => { if (active) setBoundaries(pickList(res).items); })
      .catch(() => { if (active) setBoundaries([]); });
    getCollaborationModes()
      .then((res) => { if (active) setModes(pickList(res).items); })
      .catch(() => { if (active) setModes([]); });
    return () => { active = false; };
  }, []);

  return (
    <>
      <PageHeader
        title="Demo Walkthrough"
        subtitle="Claim Toolkit Auto remains the system of record; Claim Matrix manages the shared collaboration matrix"
        actions={<Button asChild size="sm"><Link to="/new-shared-claim">Start walkthrough <ArrowRight className="h-4 w-4" /></Link></Button>}
      />

      <Card className="mb-5 border-accent/70 shadow-card">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 text-sm xl:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] xl:items-center">
            <StoryStep title="Claim Toolkit Auto" body="Operational claim, company, user, and Auto assessment data remain mastered here." />
            <div className="hidden text-accent xl:block">{"->"}</div>
            <StoryStep title="Auto Package" body="Selected documents, liability metadata, and evidence snapshot are sent to Claim Matrix." />
            <div className="hidden text-accent xl:block">{"->"}</div>
            <StoryStep title="Matrix" body="Claim Matrix scopes recipients, visibility, response rights, notifications, and audit." />
            <div className="hidden text-accent xl:block">{"->"}</div>
            <StoryStep title="Settlement and Archive" body="Structured outcomes are captured for compliance, reporting, and future analytics." />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-5 shadow-card border-accent/50">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center gap-2 font-medium"><LogIn className="h-4 w-4 text-accent" /> Access-level entry points</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            {[
              { level: "Level 1", title: "Receive-only", entry: "Email link / notification", note: "No CTK product login -- arrives straight into a shared matrix, view + respond only." },
              { level: "Level 2", title: "CTK Compliance", entry: "Compliance dashboard widget", note: "Manual entry only; Auto shown locked on the origin picker." },
              { level: "Level 3", title: "CTK Auto", entry: "Auto Liability dashboard widget", note: "Full suite -- Auto-pull or manual origin, all Ask CTK tools." },
              { level: "Level 4", title: "Claim Party", entry: "Direct invite link", note: "Strict view-only -- no menu, no nav, single-claim scope." },
              { level: "Admin", title: "Claim Matrix Admin", entry: "/admin/company-enablement", note: "Onboarding, access requests, CTK user sync, RBAC." },
            ].map((row) => (
              <div key={row.level} className="rounded-md border bg-background p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-muted-foreground">{row.level}</span>
                  <StatusBadge variant="info">{row.title}</StatusBadge>
                </div>
                <div className="mt-2 text-sm font-medium">{row.entry}</div>
                <div className="mt-1 text-xs text-muted-foreground">{row.note}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2 shadow-card border-accent/50">
          <CardContent className="p-0">
            <div className="divide-y">
              {demoSteps.map((step, index) => (
                <Link key={step.to} to={step.to} className="flex items-center gap-4 p-5 hover:bg-muted/40">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/5 text-primary text-sm font-semibold">{index + 1}</div>
                  <div className="flex-1">
                    <div className="font-medium">{step.label}</div>
                    <div className="text-sm text-muted-foreground">{step.note}</div>
                    <div className="mt-1 text-xs text-accent">{step.proof}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-accent/50 h-fit">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 font-medium"><RouteIcon className="h-4 w-4 text-accent" /> Demo states covered</div>
            {prototypeStates.map((state) => (
              <Link key={state.title} to={state.next} className="block rounded-md border p-3 hover:bg-muted/40">
                <div className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 className="h-4 w-4 text-accent" />{state.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{state.body}</div>
              </Link>
            ))}
            <StatusBadge variant="info">Review environment</StatusBadge>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-5 shadow-card border-accent/50">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center gap-2 font-medium"><ClipboardCheck className="h-4 w-4 text-accent" /> Tomorrow review checklist</div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {reviewChecklist.map((item) => (
              <div key={item} className="rounded-md border bg-background p-3"><div className="flex items-start gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 text-accent" /><span>{item}</span></div></div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mt-5">
        <Card className="shadow-card border-accent/50">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2 font-medium"><Layers className="h-4 w-4 text-primary" /> System ownership boundaries</div>
            {boundaries.length === 0 ? (
              <EmptyState title="Data not found" body="System ownership boundaries are not available yet." />
            ) : (
              <div className="space-y-2">
                {boundaries.map((item) => (
                  <div key={item.object} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{item.object}</span>
                      <StatusBadge variant={item.owner === "Claim Toolkit" ? "info" : item.owner === "Hybrid" ? "warning" : "success"}>{item.owner}</StatusBadge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.note}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card border-accent/50">
          <CardContent className="p-5">
            <div className="mb-4 font-medium">Collaboration modes</div>
            {modes.length === 0 ? (
              <EmptyState title="Data not found" body="Collaboration modes are not available yet." />
            ) : (
              <div className="space-y-3">
                {modes.map((item) => (
                  <div key={item.mode} className="rounded-md border bg-background p-3">
                    <div className="text-sm font-medium">{item.mode}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.example}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
