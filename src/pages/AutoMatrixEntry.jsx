import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ClipboardCheck, FileText, Scale, Users } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function EmbeddedPanel({ icon: Icon, title, detail, href }) {
  return (
    <a href={href} className="block rounded-md border bg-background p-4 transition hover:border-accent hover:bg-accent/5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-accent/15 text-accent"><Icon className="h-4 w-4" /></div>
        <div><div className="font-semibold">{title}</div><div className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</div></div>
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-xs text-accent"><CheckCircle2 className="h-3.5 w-3.5" /> Ready in embedded workflow</div>
    </a>
  );
}

export default function AutoMatrixEntry() {
  return (
    <>
      <div className="mb-5">
        <Link to="/claims/CM-2406-0148" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="h-4 w-4" /> Back to Matrix case
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-muted-foreground">Claim Toolkit Auto mock · AUTO-908842</div>
            <h1 className="mt-1 text-2xl font-semibold">Auto Liability Assessment</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge variant="success">Assessment complete</StatusBadge>
              <StatusBadge variant="warning">Matrix: Negotiation Active</StatusBadge>
              <StatusBadge variant="info">3-vehicle rear-end</StatusBadge>
            </div>
          </div>
          <Button asChild variant="success"><Link to="/claims/CM-2406-0148"><ClipboardCheck className="h-4 w-4" /> Claim Matrix</Link></Button>
        </div>
      </div>

      <div className="space-y-5">
        <Card className="shadow-card border-accent/50">
          <CardContent className="p-0">
            <div className="border-b bg-primary px-5 py-3 text-primary-foreground">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Claim Toolkit Auto file</div>
                  <div className="text-xs text-primary-foreground/70">Upper workspace remains Auto. The Claim Matrix button changes the lower workspace.</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge variant="success">Auto assessment complete</StatusBadge>
                  <StatusBadge variant="warning">Matrix active</StatusBadge>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3 p-5">
              {[
                ["Claim number", "NB-AUTO-908842"], ["Insured", "Lay It on Pittsburgh LLC"],
                ["Date of loss", "April 28, 2026 · 5:42 PM"], ["Location", "I-90 W, MM 142, Spokane County"],
                ["Accident type", "Rear-end / chain reaction"], ["State", "Washington"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-sm border bg-background p-3">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="mt-1 text-sm font-semibold">{value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-accent/60">
          <CardContent className="p-0">
            <div className="border-b border-accent bg-accent px-5 py-3 text-accent-foreground">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Lower Auto workspace: Claim Matrix</div>
                  <div className="text-xs text-accent-foreground/80">Opened from the Auto file without changing the user's working context.</div>
                </div>
                <StatusBadge variant="success">CM-2406-0148</StatusBadge>
              </div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_.9fr] gap-5 p-5">
              <div className="rounded-md border bg-background p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">Matrix case summary</div>
                    <div className="text-xs text-muted-foreground">Same loss, receiver, and status context now visible inside Auto.</div>
                  </div>
                  <StatusBadge variant="warning">Negotiation Active</StatusBadge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    ["Initiator", "Northbridge Insurance · John Smith"],
                    ["Receivers", "Atlas Mutual, Pioneer Casualty, Harbor Legal"],
                    ["Open disputes", "Speed, lookout"],
                    ["Next action", "Review disputes in Joint Analysis"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-sm border bg-muted/20 p-3">
                      <div className="text-xs text-muted-foreground">{label}</div>
                      <div className="mt-1 text-sm font-semibold">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <EmbeddedPanel icon={Users} title="Participants" detail="Initiator/receiver groups and current activity are available without leaving Auto." href="/claims/CM-2406-0148?tab=participants" />
                <EmbeddedPanel icon={Scale} title="Joint Analysis" detail="Scene, released assessment snapshots, ROW, speed, lookout, avoidance, and disputes." href="/claims/CM-2406-0148?tab=analysis" />
                <EmbeddedPanel icon={FileText} title="Negotiation" detail="Open conflicts feed settlement rationale, counter-offers, acceptance notes, and audit events." href="/claims/CM-2406-0148?tab=negotiation" />
              </div>
            </div>
            <div className="border-t bg-muted/30 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background p-4">
                <div>
                  <div className="text-sm font-semibold">Current Matrix action</div>
                  <div className="mt-1 text-sm text-muted-foreground">Speed and lookout remain disputed. Open Joint Analysis to compare the scene and resolve the conflict before settlement.</div>
                </div>
                <Button asChild variant="success" size="sm"><Link to="/claims/CM-2406-0148">Open full Matrix</Link></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
