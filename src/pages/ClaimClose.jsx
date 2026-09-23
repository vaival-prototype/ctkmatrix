import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import DetailRow from "@/components/shared/DetailRow";
import StatusJourney from "@/components/shared/StatusJourney";
import Spinner from "@/components/shared/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { closeClaimMatrix } from "@/services/claimService";
import { useClaimDetail } from "@/hooks/useClaimDetail";
import { usePermissions } from "@/hooks/usePermissions";
import { Archive, ArrowLeft, CheckCircle2 } from "lucide-react";

const matrixStatusJourney = [
  "Package sent",
  "Invitation accepted",
  "Negotiation active",
  "Settlement proposed",
  "Settlement accepted",
  "Matrix closed",
];

// Maps the real backend status codes (ClaimMatrixStatus.StatusCode, see
// 01_ClaimMatrix_Schema_Deploy.sql §1.3) onto the simplified 6-stage journey
// above. Falls back to "Settlement accepted" for unrecognized/missing status,
// since this page is only reached after settlement acceptance in the normal flow.
const journeyIndexByStatus = {
  draft: 0,
  sent: 0,
  "invitation-pending": 0,
  viewed: 1,
  "negotiation-active": 2,
  "under-review": 2,
  "response-submitted": 2,
  "settlement-proposed": 3,
  "settlement-countered": 3,
  "settlement-accepted": 4,
  closed: 5,
};

function statusVariant(s = "") {
  const v = s.toLowerCase();
  if (v.includes("accept") || v.includes("settled") || v.includes("closed")) return "success";
  if (v.includes("dispute") || v.includes("contest") || v.includes("reject")) return "danger";
  if (v.includes("review")) return "warning";
  return "info";
}

const checklistItems = [
  "Final liability split has been captured structurally",
  "Settlement amount and status are recorded",
  "All pending invitations have expired or been revoked",
  "Documents and metadata are versioned",
  "Audit trail is complete and exportable",
];

export default function ClaimClose() {
  const { claimId } = useParams();
  const navigate = useNavigate();
  const { data: claim, loading, error } = useClaimDetail(claimId);
  const { can } = usePermissions();
  const canClose = can("close-matrix");
  const [checks, setChecks] = useState(() => checklistItems.map(() => true));
  const [notes, setNotes] = useState(
    "Matrix closed after settlement acceptance. Final outcome retained for audit and future analytics."
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = `Close ${claimId} - Claim Matrix`;
  }, [claimId]);

  const toggle = (index) =>
    setChecks((prev) => prev.map((value, i) => (i === index ? !value : value)));

  async function handleClose() {
    if (!canClose) return;
    setSubmitting(true);
    try {
      const checklist = checklistItems.map((label, i) => ({ label, done: checks[i] }));
      await closeClaimMatrix(claimId, { checklist, notes });
      toast.success("Matrix closed");
      navigate(`/claims/${claimId}`);
    } catch (err) {
      toast.error(err.message || "Failed to close matrix");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Spinner />;

  if (error || !claim) {
    return (
      <div className="py-10">
        <EmptyState
          title="Data not found"
          body="This claim matrix could not be loaded. It may not exist or may be unavailable right now."
        />
        <div className="mt-4 flex justify-center">
          <Button asChild variant="outline" size="sm">
            <Link to="/claims">Back to matrixs</Link>
          </Button>
        </div>
      </div>
    );
  }

  const journeyIndex = journeyIndexByStatus[claim.status] ?? 4;
  const settlement = claim.exposure != null ? `${claim.exposureCurrency ?? "USD"} ${claim.exposure}` : "—";

  return (
    <>
      <PageHeader
        title="Close Matrix"
        subtitle={claim.title ? `${claim.title} — Matrix ${claimId}` : `Matrix ${claimId}`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to={`/claims/${claimId}`}><ArrowLeft className="h-4 w-4" /> Back to matrix</Link>
          </Button>
        }
      />

      <div className="mb-6 rounded-lg border bg-card p-4 shadow-card">
        <StatusJourney steps={matrixStatusJourney} current={journeyIndex} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2 shadow-card border-accent/50">
          <CardHeader><CardTitle className="text-base">Closure checklist</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {checklistItems.map((item, index) => (
              <label key={item} className="flex items-center gap-3 rounded-md border bg-background p-3 text-sm">
                <Checkbox checked={checks[index]} onCheckedChange={() => toggle(index)} />
                {item}
              </label>
            ))}
            <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </CardContent>
        </Card>

        <Card className="shadow-card border-accent/50 h-fit">
          <CardHeader><CardTitle className="text-base">Close summary</CardTitle></CardHeader>
          <CardContent>
            <DetailRow label="Matrix" value={claimId} />
            <DetailRow
              label="Final status"
              value={<StatusBadge variant={statusVariant(claim.status)}>{claim.statusLabel ?? claim.status ?? "—"}</StatusBadge>}
            />
            <DetailRow label="Settlement" value={settlement} />
            <DetailRow label="Archive mode" value="Read-only" />
            {!canClose && (
              <div className="mt-3 rounded-md border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
                Your role does not have permission to close this matrix.
              </div>
            )}
            <div className="mt-5 grid gap-2">
              <Button variant="success" onClick={handleClose} disabled={submitting || !canClose}>
                <CheckCircle2 className="h-4 w-4" /> {submitting ? "Closing…" : "Close matrix"}
              </Button>
              <Button asChild variant="outline"><Link to={`/claims/${claimId}`}><Archive className="h-4 w-4" /> Archive draft</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
