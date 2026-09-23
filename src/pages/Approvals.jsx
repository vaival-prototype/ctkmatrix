import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import PageHeader from "@/components/shared/PageHeader";
import Spinner from "@/components/shared/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useApprovals } from "@/hooks/useApprovals";
import { usePermissions } from "@/hooks/usePermissions";
import { submitApprovalDecision } from "@/services/approvalService";
import { CheckCircle2, ShieldAlert, XCircle } from "lucide-react";

export default function Approvals() {
  const { data: approvalQueue, loading, error } = useApprovals();
  const { can } = usePermissions();
  const canDecide = can("approve-access");
  const [decisions, setDecisions] = useState({});
  const [pendingId, setPendingId] = useState(null);

  async function decide(id, decision) {
    if (!canDecide) return;
    setPendingId(id);
    try {
      await submitApprovalDecision(id, { decision });
      setDecisions((prev) => ({ ...prev, [id]: decision }));
      toast.success(decision === "approve" ? "Request approved" : "Request declined");
    } catch (err) {
      toast.error(err.message || "Failed to submit decision");
    } finally {
      setPendingId(null);
    }
  }

  if (loading) return <Spinner />;
  if (error) {
    return (
      <>
        <PageHeader title="Supervisor Approval Queue" subtitle="Supervisor review path for external sharing when approval is required" />
        <EmptyState title="Couldn't load the approval queue" body={error.message} />
      </>
    );
  }

  const queue = approvalQueue ?? [];

  return (
    <>
      <PageHeader
        title="Supervisor Approval Queue"
        subtitle="Supervisor review path for external sharing when approval is required"
        actions={<StatusBadge variant="warning">Decision pending</StatusBadge>}
      />

      {queue.length === 0 ? (
        <EmptyState title="No pending approvals" body="External sharing requests that need supervisor review will appear here." />
      ) : (
        <Card className="shadow-card border-accent/50">
          <CardContent className="p-0">
            <div className="divide-y">
              {queue.map((approval) => {
                const decision = decisions[approval.id];
                return (
                  <div key={approval.id} className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-warning/20 text-warning-foreground">
                        <ShieldAlert className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-semibold">{approval.matrixId}</div>
                          <StatusBadge variant={approval.risk === "Medium" ? "warning" : "info"}>{approval.risk} risk</StatusBadge>
                          <StatusBadge variant="muted">{approval.status}</StatusBadge>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {approval.requester} from {approval.company} wants to share with {approval.recipient}.
                        </div>
                        <div className="mt-3 rounded-md border bg-background p-3 text-sm">{approval.reason}</div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {decision ? (
                          <StatusBadge variant={decision === "approve" ? "success" : "danger"}>
                            {decision === "approve" ? "Approved" : "Declined"}
                          </StatusBadge>
                        ) : canDecide ? (
                          <>
                            <Button size="sm" disabled={pendingId === approval.id} onClick={() => decide(approval.id, "approve")}>
                              <CheckCircle2 className="h-4 w-4" /> Approve
                            </Button>
                            <Button variant="outline" size="sm" disabled={pendingId === approval.id} onClick={() => decide(approval.id, "reject")}>
                              <XCircle className="h-4 w-4" /> Decline
                            </Button>
                          </>
                        ) : (
                          <StatusBadge variant="muted">Not permitted</StatusBadge>
                        )}
                        <Button asChild variant="ghost" size="sm"><Link to={`/claims/${approval.matrixId}`}>Review</Link></Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
