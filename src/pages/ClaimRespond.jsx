import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import DetailRow from "@/components/shared/DetailRow";
import Stepper from "@/components/shared/Stepper";
import Spinner from "@/components/shared/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { submitClaimResponse } from "@/services/claimService";
import { useClaimDetail } from "@/hooks/useClaimDetail";
import { useDocuments } from "@/hooks/useDocuments";
import { ArrowLeft, CheckCircle2, FileUp, Gavel, GitBranch, Map, Scale, Send, ShieldCheck, Upload } from "lucide-react";

// Display labels for the Select options below — shared with the Submission summary and
// Legal traceability panels so both reflect the same live choice, not fixed demo text.
const RESPONSE_TYPE_LABELS = {
  agree: "Agree",
  dispute: "Dispute liability",
  request: "Request more information",
  counter: "Submit counter-position",
};
const LIABILITY_POSITION_LABELS = {
  accepted: "Liability accepted",
  disputed: "Liability disputed",
  partial: "Partially accepted",
};
const DISPUTED_ITEM_LABELS = {
  liability: "Liability percentage",
  evidence: "Evidence interpretation",
  coverage: "Coverage position",
  settlement: "Settlement value",
};
const REASON_CATEGORY_LABELS = {
  "right-of-way": "Right-of-way conflict",
  visibility: "Reduced visibility",
  evidence: "Contradictory evidence",
  statute: "Statutory interpretation",
};
const FINAL_RESOLUTION_LABELS = {
  pending: "Pending negotiation",
  accepted: "Accepted",
  rejected: "Rejected",
  closed: "Closed / resolved",
};

const labelOf = (map, value) => map[value] ?? value ?? "—";

// Only currentPosition/reasonCategory/finalResolution get a real starting value (the first
// two neutral placeholders a controlled Select needs, the third the real matrix liability
// once it loads) — everything the adjuster needs to actually argue is left blank rather
// than pre-filled with a fabricated position.
const initialForm = {
  responseType: "agree",
  liabilityPosition: "accepted",
  disputedItem: "liability",
  currentPosition: "",
  requestedChange: "",
  reasonCategory: "right-of-way",
  statutoryReference: "",
  settlementOffer: "",
  counterOffer: "",
  finalResolution: "pending",
  explanation: "",
};

function Field({ label, children }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}

export default function ClaimRespond() {
  const { claimId } = useParams();
  const { data: claim, loading, error } = useClaimDetail(claimId);
  const { data: allDocuments } = useDocuments();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(initialForm);

  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    document.title = `Respond to ${claimId} - Claim Matrix`;
  }, [claimId]);

  // Real matrix liability, once it loads — only fills the field while it's still untouched,
  // so it never overwrites something the adjuster already typed.
  useEffect(() => {
    if (claim?.liability) {
      setForm((prev) => (prev.currentPosition ? prev : { ...prev, currentPosition: claim.liability }));
    }
  }, [claim]);

  const documents = (allDocuments ?? []).filter((d) => d.matrixId === claimId);

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

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await submitClaimResponse(claimId, form);
      setSubmitted(true);
      toast.success("Structured response submitted");
    } catch (err) {
      toast.error(err.message || "Failed to submit response");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Submit Structured Response"
        subtitle={claim.title ? `${claim.title} — Matrix ${claimId}` : `Matrix ${claimId}`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to={`/claims/${claimId}`}><ArrowLeft className="h-4 w-4" /> Back to matrix</Link>
          </Button>
        }
      />

      <div className="mb-6">
        <Stepper steps={["Response type", "Disputed item", "Evidence", "Submit"]} current={2} />
      </div>

      {submitted && (
        <Card className="mb-5 border-accent/60 bg-accent/10 shadow-card">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-accent" />
              <div>
                <div className="font-medium">Structured response submitted</div>
                <div className="text-sm text-muted-foreground">
                  Response Submitted status, audit entry, and email/in-app/Claim Toolkit notifications are now queued.
                </div>
              </div>
            </div>
            <Button asChild variant="success" size="sm">
              <Link to={`/claims/${claimId}`}>Open matrix</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2 shadow-card border-accent/50">
          <CardHeader>
            <CardTitle className="text-base">Guided response</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Response type">
                <Select value={form.responseType} onValueChange={set("responseType")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agree">Agree</SelectItem>
                    <SelectItem value="dispute">Dispute liability</SelectItem>
                    <SelectItem value="request">Request more information</SelectItem>
                    <SelectItem value="counter">Submit counter-position</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Liability position">
                <Select value={form.liabilityPosition} onValueChange={set("liabilityPosition")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accepted">Liability accepted</SelectItem>
                    <SelectItem value="disputed">Liability disputed</SelectItem>
                    <SelectItem value="partial">Partially accepted</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Disputed item">
                <Select value={form.disputedItem} onValueChange={set("disputedItem")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="liability">Liability percentage</SelectItem>
                    <SelectItem value="evidence">Evidence interpretation</SelectItem>
                    <SelectItem value="coverage">Coverage position</SelectItem>
                    <SelectItem value="settlement">Settlement value</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Current position">
                <Input value={form.currentPosition} onChange={(e) => set("currentPosition")(e.target.value)} />
              </Field>
              <Field label="Requested change">
                <Input value={form.requestedChange} onChange={(e) => set("requestedChange")(e.target.value)} />
              </Field>
              <Field label="Reason category">
                <Select value={form.reasonCategory} onValueChange={set("reasonCategory")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="right-of-way">Right-of-way conflict</SelectItem>
                    <SelectItem value="visibility">Reduced visibility</SelectItem>
                    <SelectItem value="evidence">Contradictory evidence</SelectItem>
                    <SelectItem value="statute">Statutory interpretation</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Statutory reference">
                <Input value={form.statutoryReference} onChange={(e) => set("statutoryReference")(e.target.value)} />
              </Field>
              <Field label="Settlement offer">
                <Input value={form.settlementOffer} onChange={(e) => set("settlementOffer")(e.target.value)} />
              </Field>
              <Field label="Counter-offer">
                <Input value={form.counterOffer} onChange={(e) => set("counterOffer")(e.target.value)} />
              </Field>
              <Field label="Final resolution">
                <Select value={form.finalResolution} onValueChange={set("finalResolution")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending negotiation</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="closed">Closed / resolved</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="Supporting explanation">
              <Textarea rows={5} value={form.explanation} onChange={(e) => set("explanation")(e.target.value)} />
            </Field>

            <div className="rounded-lg border bg-background p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">Scene diagram response</div>
                  <div className="text-xs text-muted-foreground">Level 2+ users can submit a rebuttal diagram without full Auto access.</div>
                </div>
                <StatusBadge variant="info">Compliance-enabled</StatusBadge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
                <div className="rounded-md border bg-muted/30 p-4">
                  <div className="flex h-44 items-center justify-center rounded-md border border-dashed bg-card text-sm text-muted-foreground">
                    <Map className="mr-2 h-5 w-5 text-accent" />
                    Rebuttal scene diagram canvas placeholder
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="rounded-md border bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">Diagram purpose</div>
                    <div className="mt-1 font-medium">Show lead vehicle stop and following distance</div>
                  </div>
                  <div className="rounded-md border bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">Attach to methodology</div>
                    <div className="mt-1 font-medium">Speed, lookout, avoidance</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-background p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="text-sm font-medium">Supporting evidence</div>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/documents/upload?matrixId=${encodeURIComponent(claimId)}`}>
                    <Upload className="h-3.5 w-3.5" /> Attach evidence
                  </Link>
                </Button>
              </div>
              {documents.length === 0 ? (
                <p className="text-xs text-muted-foreground">No documents are attached to this matrix yet.</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {documents.map((doc) => (
                    <Link
                      key={doc.id}
                      to={`/documents/${doc.id}`}
                      className="flex items-center gap-3 rounded-md border p-3 text-sm hover:bg-muted/40"
                    >
                      <FileUp className="h-4 w-4 text-info" />
                      <span className="flex-1 truncate">{doc.name || doc.title || "Document"}</span>
                      <StatusBadge variant="info">{doc.status || "Attached"}</StatusBadge>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-accent/50 h-fit">
          <CardHeader><CardTitle className="text-base">Submission summary</CardTitle></CardHeader>
          <CardContent>
            <DetailRow label="Matrix" value={claimId} />
            <DetailRow label="Response" value={labelOf(RESPONSE_TYPE_LABELS, form.responseType)} />
            <DetailRow label="Liability" value={labelOf(LIABILITY_POSITION_LABELS, form.liabilityPosition)} />
            <DetailRow label="Requested change" value={form.requestedChange || "—"} />
            <DetailRow label="Counter-offer" value={form.counterOffer || "—"} />
            <DetailRow label="Final resolution" value={labelOf(FINAL_RESOLUTION_LABELS, form.finalResolution)} />
            <DetailRow label="Evidence" value={`${documents.length} file${documents.length === 1 ? "" : "s"}`} />
            <DetailRow label="Audit" value="Will be recorded" />
            <Button type="button" className="mt-5 w-full" onClick={handleSubmit} disabled={submitting}>
              <Send className="h-4 w-4" /> {submitting ? "Submitting…" : "Submit response"}
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-card border-accent/50 xl:col-start-3">
          <CardHeader><CardTitle className="text-base">Legal traceability</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Response type", value: labelOf(RESPONSE_TYPE_LABELS, form.responseType), icon: GitBranch },
              { label: "Disputed item", value: labelOf(DISPUTED_ITEM_LABELS, form.disputedItem), icon: Scale },
              { label: "Reason for dispute", value: labelOf(REASON_CATEGORY_LABELS, form.reasonCategory), icon: Gavel },
              { label: "Legal / statutory reference", value: form.statutoryReference || "—", icon: ShieldCheck },
              { label: "Requested change", value: form.requestedChange || "—", icon: GitBranch },
              { label: "Audit event", value: "response.submitted queued for notifications and immutable history", icon: ShieldCheck },
            ].map((item) => (
              <div key={item.label} className="rounded-md border bg-background p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <item.icon className="h-3.5 w-3.5 text-accent" />
                  {item.label}
                </div>
                <div className="mt-1 text-sm font-medium leading-relaxed">{item.value}</div>
              </div>
            ))}
            <div className="rounded-md border bg-muted/35 p-3 text-xs text-muted-foreground">
              This structured response avoids free-form-only negotiation by tying the position, disputed field, statute, evidence, requested change, and settlement posture to the matrix audit trail.
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
