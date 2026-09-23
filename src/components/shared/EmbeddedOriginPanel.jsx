import { Link } from "react-router-dom";
import { CheckCircle2, ClipboardCheck, FileText, MessageSquareWarning, Scale, Users } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAccessTier } from "@/hooks/useAccessTier";

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

/**
 * Shared "opened from <App>" embedded chrome — the Compliance and Audit
 * counterpart to AutoMatrixEntry.jsx. Unlike Auto, these origin apps have no
 * assessment workspace behind the matrix, so there is no upper "operational
 * file" panel — just the matter context and the negotiation-stage matrix.
 */
export default function EmbeddedOriginPanel({ appLabel, sourceApp, matterFields, matrixId, matrixTitle, participantsSummary, backTo }) {
  const { capabilities } = useAccessTier();

  return (
    <>
      <div className="mb-5">
        <Link to={backTo} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">Back to {appLabel}</Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-muted-foreground">{sourceApp} mock · {matrixId}</div>
            <h1 className="mt-1 text-2xl font-semibold">{appLabel} workspace</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge variant="info">No assessment attached</StatusBadge>
              <StatusBadge variant="warning">Matrix: Negotiation Active</StatusBadge>
            </div>
          </div>
          {capabilities.initiate ? (
            <Button asChild variant="success"><Link to={`/new-shared-claim?app=level2&mode=manual`}><ClipboardCheck className="h-4 w-4" /> Initiate another matrix</Link></Button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <MessageSquareWarning className="h-3.5 w-3.5" /> This account receives matrices only — initiating requires a CTK Compliance or CTK Auto account.
            </span>
          )}
        </div>
      </div>

      <div className="space-y-5">
        <Card className="shadow-card border-accent/50">
          <CardContent className="p-0">
            <div className="border-b bg-primary px-5 py-3 text-primary-foreground">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{sourceApp} file</div>
                  <div className="text-xs text-primary-foreground/70">{appLabel} matters start at negotiation — there is no assessment stage to embed here.</div>
                </div>
                <StatusBadge variant="info">Origin: {appLabel}</StatusBadge>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-5">
              {matterFields.map(([label, value]) => (
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
                  <div className="text-sm font-semibold">Claim Matrix</div>
                  <div className="text-xs text-accent-foreground/80">Opened from {appLabel} without changing the user's working context.</div>
                </div>
                <StatusBadge variant="success">{matrixId}</StatusBadge>
              </div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_.9fr] gap-5 p-5">
              <div className="rounded-md border bg-background p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div><div className="text-sm font-semibold">Matrix case summary</div><div className="text-xs text-muted-foreground">{matrixTitle}</div></div>
                  <StatusBadge variant="warning">Negotiation Active</StatusBadge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {participantsSummary.map(([label, value]) => (
                    <div key={label} className="rounded-sm border bg-muted/20 p-3">
                      <div className="text-xs text-muted-foreground">{label}</div>
                      <div className="mt-1 text-sm font-semibold">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <EmbeddedPanel icon={Users} title="Participants" detail="Initiator/receiver groups and current activity are available without leaving this app." href={`/claims/${matrixId}?tab=participants`} />
                <EmbeddedPanel icon={Scale} title="Negotiation" detail="Positions, counter-offers, and audit events — the matrix opened directly here, no assessment tab exists." href={`/claims/${matrixId}?tab=negotiation`} />
                <EmbeddedPanel icon={FileText} title="Documents" detail="Files uploaded directly at initiation, plus anything shared since." href="/documents" />
              </div>
            </div>
            <div className="border-t bg-muted/30 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background p-4">
                <div><div className="text-sm font-semibold">Current Matrix action</div><div className="mt-1 text-sm text-muted-foreground">Review the recipient's position and respond from the full matrix.</div></div>
                <Button asChild variant="success" size="sm"><Link to={`/claims/${matrixId}`}>Open full Matrix</Link></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
