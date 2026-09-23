import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import DetailRow from "@/components/shared/DetailRow";
import Spinner from "@/components/shared/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { submitSettlementAction } from "@/services/claimService";
import { useClaimDetail } from "@/hooks/useClaimDetail";
import { useAuth } from "@/context/AuthContext";
import { useAccessTier } from "@/hooks/useAccessTier";
import { ArrowLeft, CheckCircle2, Handshake, Send } from "lucide-react";

function Field({ label, children }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}

function daysSince(dateString) {
  if (!dateString) return null;
  const days = Math.round((Date.now() - new Date(dateString).getTime()) / 86_400_000);
  return days >= 0 ? days : null;
}

export default function ClaimSettlement() {
  const { claimId } = useParams();
  const { data: claim, loading, error } = useClaimDetail(claimId);
  const { user } = useAuth();
  const { tierKey } = useAccessTier();
  const [proposalSent, setProposalSent] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [action, setAction] = useState("counter");
  const [amount, setAmount] = useState("");
  const [split, setSplit] = useState("");
  const [status, setStatus] = useState("pending");
  const [terms, setTerms] = useState("");

  const [acceptRationale, setAcceptRationale] = useState("methodology");
  const [evidenceReference, setEvidenceReference] = useState("police-estimate");
  const [offerRationale, setOfferRationale] = useState("");
  const [acceptanceNote, setAcceptanceNote] = useState("");

  useEffect(() => {
    document.title = `Settlement - ${claimId}`;
  }, [claimId]);

  // Real current liability split, once it loads — only while the field is still untouched,
  // so it never overwrites something the adjuster already typed.
  useEffect(() => {
    if (claim?.liability) {
      setSplit((prev) => (prev ? prev : claim.liability));
    }
  }, [claim]);

  if (loading) return <Spinner />;

  if (tierKey === "level4") {
    return (
      <div className="py-10">
        <EmptyState
          title="View only"
          body="Claim Party accounts can view offer status on a matrix but can't propose, accept, or counter a settlement."
        />
        <div className="mt-4 flex justify-center">
          <Button asChild variant="outline" size="sm">
            <Link to={`/claims/${claimId}`}>Back to matrix</Link>
          </Button>
        </div>
      </div>
    );
  }

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

  const currentOffer = claim.exposure != null ? `${claim.exposureCurrency ?? "USD"} ${claim.exposure}` : "—";
  const acceptedByName = user?.name ?? "—";
  const acceptedByCompany = user?.company ?? "";
  const resolutionDays = daysSince(claim.opened);

  async function handleSendProposal() {
    setSubmitting(true);
    try {
      await submitSettlementAction(claimId, { action, amount, split, status, terms, rationale: terms });
      setProposalSent(true);
      setAccepted(false);
      toast.success("Settlement proposal sent");
    } catch (err) {
      toast.error(err.message || "Failed to send proposal");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAccept() {
    setSubmitting(true);
    try {
      await submitSettlementAction(claimId, {
        action: "accept",
        rationale: acceptRationale,
        evidenceReference,
        offerRationale,
        acceptanceNote,
      });
      setAccepted(true);
      setProposalSent(false);
      toast.success("Settlement accepted");
    } catch (err) {
      toast.error(err.message || "Failed to accept settlement");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Settlement Proposal"
        subtitle={claim.title ? `${claim.title} — Matrix ${claimId}` : `Matrix ${claimId}`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to={`/claims/${claimId}`}><ArrowLeft className="h-4 w-4" /> Back to matrix</Link>
          </Button>
        }
      />

      {(proposalSent || accepted) && (
        <Card className="mb-5 border-accent/60 bg-accent/10 shadow-card">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-accent" />
              <div>
                <div className="font-medium">
                  {accepted ? "Settlement accepted" : "Settlement proposal sent"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {accepted
                    ? "Structured settlement outcome captured. Status is Settlement Accepted; notifications and audit events are queued."
                    : "Structured settlement event created under Negotiation Active; recipients receive email, in-app, and Claim Toolkit / Auto notifications."}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to={`/claims/${claimId}`}>Return to matrix</Link>
              </Button>
              {accepted && (
                <Button asChild variant="success" size="sm">
                  <Link to={`/claims/${claimId}/close`}>Close matrix</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2 shadow-card border-accent/50">
          <CardHeader><CardTitle className="text-base">Offer details</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Action">
                <Select value={action} onValueChange={setAction}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="propose">Propose settlement</SelectItem>
                    <SelectItem value="counter">Counter-offer</SelectItem>
                    <SelectItem value="accept">Accept current offer</SelectItem>
                    <SelectItem value="reject">Reject offer</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Offer amount">
                <Input value={amount} onChange={(e) => setAmount(e.target.value)} />
              </Field>
              <Field label="Final liability split">
                <Input value={split} onChange={(e) => setSplit(e.target.value)} />
              </Field>
              <Field label="Settlement status">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending response</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Terms and rationale">
              <Textarea rows={6} value={terms} onChange={(e) => setTerms(e.target.value)} />
            </Field>
            <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
              The final accepted outcome will be stored structurally for audit, reporting, and future analytics. The system records the adjuster's rationale; it does not decide the settlement.
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-accent/50 h-fit">
          <CardHeader><CardTitle className="text-base">Outcome capture</CardTitle></CardHeader>
          <CardContent>
            <DetailRow label="Current offer" value={currentOffer} />
            <DetailRow label="Counter-offer" value={amount || "—"} />
            <DetailRow label="Original liability" value={claim.liability || "—"} />
            <DetailRow label="Final liability" value={split || "—"} />
            <DetailRow label="Time to resolution" value={resolutionDays != null ? `${resolutionDays}d` : "—"} />
            <DetailRow label="Next status" value={accepted ? <StatusBadge variant="success">Settlement Accepted</StatusBadge> : <StatusBadge variant="info">Negotiation Active</StatusBadge>} />
            <div className="mt-5 grid gap-2">
              <Button type="button" onClick={handleSendProposal} disabled={submitting}>
                <Send className="h-4 w-4" /> {submitting ? "Sending…" : "Send proposal"}
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button type="button" variant="success">
                    <CheckCircle2 className="h-4 w-4" /> Accept settlement
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[620px]">
                  <DialogHeader>
                    <DialogTitle>Accept settlement?</DialogTitle>
                    <DialogDescription>
                      Confirm the final structured settlement outcome before moving the matrix to Settlement Accepted.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="rounded-md border bg-background p-4">
                    <DetailRow label="Accepted amount" value={amount || currentOffer} />
                    <DetailRow label="Final liability split" value={split || claim.liability || "—"} />
                    <DetailRow
                      label="Accepted by"
                      value={acceptedByCompany ? `${acceptedByName} · ${acceptedByCompany}` : acceptedByName}
                    />
                    <DetailRow label="Audit event" value="settlement.accepted" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Acceptance rationale">
                      <Select value={acceptRationale} onValueChange={setAcceptRationale}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="methodology">ROW + speed + lookout analysis</SelectItem>
                          <SelectItem value="evidence">Physical evidence / damage pattern</SelectItem>
                          <SelectItem value="statute">Statutory duty reference</SelectItem>
                          <SelectItem value="custom">Custom rationale</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Evidence reference">
                      <Select value={evidenceReference} onValueChange={setEvidenceReference}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="police-estimate">Police report §4 + repair estimate v3</SelectItem>
                          <SelectItem value="witness">Witness statement</SelectItem>
                          <SelectItem value="scene">Scene diagram</SelectItem>
                          <SelectItem value="none">No evidence reference</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <Field label="Editable offer rationale">
                    <Textarea rows={3} value={offerRationale} onChange={(e) => setOfferRationale(e.target.value)} />
                  </Field>
                  <Field label="Acceptance note from accepting party">
                    <Textarea rows={4} value={acceptanceNote} onChange={(e) => setAcceptanceNote(e.target.value)} />
                  </Field>
                  <div className="rounded-md border bg-muted/35 p-3 text-sm text-muted-foreground">
                    This records final settlement amount, liability split, acceptance note, acceptance timestamp, notification events,
                    and a structured outcome for audit and future analytics. Closing the matrix remains a separate final step.
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline">Review terms</Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button type="button" variant="success" onClick={handleAccept} disabled={submitting}>
                        <CheckCircle2 className="h-4 w-4" /> Confirm acceptance
                      </Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button asChild variant="outline"><Link to={`/claims/${claimId}`}><Handshake className="h-4 w-4" /> Save as draft</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
