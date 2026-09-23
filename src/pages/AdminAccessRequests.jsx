import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import Spinner from "@/components/shared/Spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAccessRequests } from "@/hooks/useAccessRequests";
import { decideAccessRequest } from "@/services/accessService";
import { ArrowLeft, CheckCircle2, XCircle, Eye, Mail, CalendarClock } from "lucide-react";

function statusVariant(status) {
  if (status === "Approved") return "success";
  if (status === "Rejected") return "danger";
  return "warning";
}

function formatRequestedAt(iso) {
  if (!iso) return "Unknown";
  try {
    return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function DetailRow({ label, value }) {
  return (
    <div className="rounded-sm border bg-muted/20 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold break-words">{value || "-"}</div>
    </div>
  );
}

export default function AdminAccessRequests() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, loading, error } = useAccessRequests(refreshKey);
  const [actingId, setActingId] = useState(null);
  const [detailsRow, setDetailsRow] = useState(null);
  const rows = data ?? [];

  async function act(id, decision, label) {
    setActingId(id);
    try {
      await decideAccessRequest(id, decision);
      toast.success(label);
      setRefreshKey((k) => k + 1);
      setDetailsRow(null);
    } catch (err) {
      toast.error(err.message || "Could not update the request");
    } finally {
      setActingId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Access requests"
        subtitle="Self-serve signups from people who were never invited — reviewed manually before any account is created"
        actions={<Button asChild variant="outline" size="sm"><Link to="/admin/company-enablement"><ArrowLeft className="h-4 w-4" /> Admin</Link></Button>}
      />

      <Card className="shadow-card border-accent/50 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6"><Spinner /></div>
          ) : error || rows.length === 0 ? (
            <div className="p-6"><EmptyState title="No access requests" body={error ? error.message : "No self-serve signups are waiting on review."} /></div>
          ) : (
            <div className="divide-y">
              {rows.map((r) => (
                <div key={r.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{r.name} <span className="font-normal text-muted-foreground">· {r.email}</span></div>
                      <div className="mt-1 text-sm text-muted-foreground">{r.company} · domain {r.domain}</div>
                      {r.reason && <div className="mt-2 text-sm italic text-muted-foreground line-clamp-2">"{r.reason}"</div>}
                    </div>
                    <StatusBadge variant={statusVariant(r.status)}>{r.status}</StatusBadge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setDetailsRow(r)}>
                      <Eye className="h-4 w-4" /> View details
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <a href={`mailto:${r.email}?subject=${encodeURIComponent(`Your Claim Matrix access request — ${r.company}`)}`}>
                        <Mail className="h-4 w-4" /> Email applicant
                      </a>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toast.info("Opens the admin's calendar to schedule a call with the applicant — calendar integration not wired up in this prototype.")}>
                      <CalendarClock className="h-4 w-4" /> Schedule call
                    </Button>
                    <Button size="sm" variant="success" disabled={actingId === r.id || r.status !== "Pending review"} onClick={() => act(r.id, "approve", "Access approved — account created as a free receiver")}>
                      <CheckCircle2 className="h-4 w-4" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" disabled={actingId === r.id || r.status !== "Pending review"} onClick={() => act(r.id, "reject", "Request rejected")}>
                      <XCircle className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detailsRow} onOpenChange={(open) => !open && setDetailsRow(null)}>
        <DialogContent className="max-w-xl">
          {detailsRow && (
            <>
              <DialogHeader>
                <DialogTitle>Access request details</DialogTitle>
                <DialogDescription>Everything submitted with this self-serve request, reviewed manually before an account is created.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DetailRow label="Name" value={detailsRow.name} />
                <DetailRow label="Email" value={detailsRow.email} />
                <DetailRow label="Company" value={detailsRow.company} />
                <DetailRow label="Email domain" value={detailsRow.domain} />
                <DetailRow label="Requested" value={formatRequestedAt(detailsRow.requestedAt)} />
                <DetailRow label="Status" value={detailsRow.status} />
              </div>
              <div className="rounded-sm border bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground">Reason for requesting access</div>
                <div className="mt-1 text-sm leading-relaxed">{detailsRow.reason || "No reason was provided."}</div>
              </div>
              <DialogFooter>
                <Button asChild variant="outline">
                  <a href={`mailto:${detailsRow.email}?subject=${encodeURIComponent(`Your Claim Matrix access request — ${detailsRow.company}`)}`}>
                    <Mail className="h-4 w-4" /> Email applicant
                  </a>
                </Button>
                <Button
                  variant="outline"
                  disabled={actingId === detailsRow.id || detailsRow.status !== "Pending review"}
                  onClick={() => act(detailsRow.id, "reject", "Request rejected")}
                >
                  <XCircle className="h-4 w-4" /> Reject
                </Button>
                <Button
                  variant="success"
                  disabled={actingId === detailsRow.id || detailsRow.status !== "Pending review"}
                  onClick={() => act(detailsRow.id, "approve", "Access approved — account created as a free receiver")}
                >
                  <CheckCircle2 className="h-4 w-4" /> Approve
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
