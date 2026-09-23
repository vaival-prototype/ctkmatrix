import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import DetailRow from "@/components/shared/DetailRow";
import Stepper from "@/components/shared/Stepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCompanies } from "@/hooks/useCompanies";
import { useAccessTier } from "@/hooks/useAccessTier";
import { createClaimMatrix } from "@/services/claimService";
import { pickData } from "@/services/api";
import {
  ArrowLeft, Building2, CheckCircle2, FileText, Mail, MessageSquareWarning, Send, ShieldCheck, Upload, UserPlus,
} from "lucide-react";

const APP_META = {
  compliance: { label: "Compliance", sourceApp: "AI for Compliance" },
  audit: { label: "Audit", sourceApp: "Claim Audit" },
  "matrix-paid": { label: "Matrix", sourceApp: "Claim Matrix" },
};

function wizardTitle(step) {
  return ["Matter details", "Upload documents", "Choose recipient & invite", "Review & send", "Negotiation space"][step - 1] ?? "Review";
}

function Field({ label, children }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}

function PackageFact({ icon: Icon, label, value }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5 text-accent" /> {label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

export default function InitiateMatrix() {
  const [searchParams] = useSearchParams();
  const originApp = ["compliance", "audit", "matrix-paid"].includes(searchParams.get("app")) ? searchParams.get("app") : "compliance";
  const meta = APP_META[originApp];

  const { data: companiesData } = useCompanies();
  const { capabilities } = useAccessTier();
  const companies = companiesData ?? [];

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [claimReference, setClaimReference] = useState("");
  const [claimType, setClaimType] = useState("Comparative negligence / liability dispute");
  const [description, setDescription] = useState("");
  const [fileNames, setFileNames] = useState([]);
  const [recipientCompany, setRecipientCompany] = useState("");
  const [invitedEmail, setInvitedEmail] = useState("");
  const [permissionScope, setPermissionScope] = useState("comment-evidence");
  const [message, setMessage] = useState(
    "Sharing this matter through Claim Matrix at the negotiation stage. Please review and respond with your position."
  );
  const [submitting, setSubmitting] = useState(false);
  const [createdMatrixId, setCreatedMatrixId] = useState(null);

  const recipientCompanies = companies.filter((c) => c.name);

  useEffect(() => {
    document.title = `Initiate Matrix - ${meta.label}`;
  }, [meta.label]);

  useEffect(() => {
    if (!recipientCompany && recipientCompanies.length) setRecipientCompany(recipientCompanies[0].id);
  }, [recipientCompanies, recipientCompany]);

  function handleFileSelect(e) {
    const names = Array.from(e.target.files || []).map((f) => f.name);
    setFileNames((prev) => [...prev, ...names]);
  }

  async function handleCreate() {
    setSubmitting(true);
    try {
      const res = await createClaimMatrix({
        title: title || `${meta.label} matter - ${claimReference || "untitled"}`,
        originApp,
        claimReference,
        claimType,
        description,
        recipientCompany: recipientCompanies.find((c) => c.id === recipientCompany)?.name ?? recipientCompany,
        invitedEmail,
        permissionScope,
        message,
        includedDocuments: fileNames,
      });
      setCreatedMatrixId(pickData(res)?.id ?? null);
      setStep(5);
      toast.success("Matrix created");
    } catch (err) {
      toast.error(err.message || "Failed to create matrix");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title={`Initiate Matrix from ${meta.label}`}
        subtitle={`${meta.sourceApp} users start a matrix directly at the negotiation stage — no Auto assessment is attached.`}
        actions={<Button asChild variant="outline" size="sm"><Link to="/dashboard"><ArrowLeft className="h-4 w-4" /> Back to dashboard</Link></Button>}
      />

      {!capabilities.initiate && (
        <Card className="mb-5 border-warning/60 bg-warning/10">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-2 text-sm"><MessageSquareWarning className="h-4 w-4 text-warning-foreground" /> Your account is a free receiver and can't initiate a matrix yet.</div>
            <Button asChild size="sm" variant="success"><Link to="/upgrade">Request initiator access</Link></Button>
          </CardContent>
        </Card>
      )}

      <div className="mb-6"><Stepper steps={["Matter details", "Documents", "Recipient", "Review & Send", "Negotiation"]} current={step} /></div>

      <Card className="mb-5 border-accent/70 bg-card shadow-card">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 text-sm lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
            <div className="rounded-md border border-accent/35 bg-background p-3">
              <div className="font-semibold text-foreground">1. {meta.sourceApp}</div>
              <div className="mt-1 text-xs leading-relaxed text-muted-foreground">No Auto claim behind this matter — the {meta.label.toLowerCase()} user enters the matter directly.</div>
            </div>
            <div className="hidden text-accent lg:block">{"->"}</div>
            <div className="rounded-md border border-accent/35 bg-background p-3">
              <div className="font-semibold text-foreground">2. Negotiation-stage entry</div>
              <div className="mt-1 text-xs leading-relaxed text-muted-foreground">No assessment tab — the matrix opens straight into negotiation, same as a compliance/audit-originated matter.</div>
            </div>
            <div className="hidden text-accent lg:block">{"->"}</div>
            <div className="rounded-md border border-accent/35 bg-background p-3">
              <div className="font-semibold text-foreground">3. Shared collaboration</div>
              <div className="mt-1 text-xs leading-relaxed text-muted-foreground">Claim Matrix scopes recipients, permissions, notifications, and audit — identical to the Auto flow from here.</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2 shadow-card border-accent/50">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base">{wizardTitle(step)}</CardTitle>
              <StatusBadge variant="info">Source: {meta.sourceApp}</StatusBadge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {step === 1 && (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Matter / matrix title">
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Statutory demand review - Coastal Freight Partners" />
                </Field>
                <Field label="Reference (optional)">
                  <Input value={claimReference} onChange={(e) => setClaimReference(e.target.value)} placeholder="Internal file/matter number" />
                </Field>
                <Field label="Matter type">
                  <Select value={claimType} onValueChange={setClaimType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Comparative negligence / liability dispute">Comparative negligence / liability dispute</SelectItem>
                      <SelectItem value="Statutory / regulatory demand">Statutory / regulatory demand</SelectItem>
                      <SelectItem value="Audit finding dispute">Audit finding dispute</SelectItem>
                      <SelectItem value="Other negotiation">Other negotiation</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <div />
                <div className="col-span-2">
                  <Field label="Description">
                    <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is being negotiated and why." />
                  </Field>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <div className="rounded-lg border-2 border-dashed border-accent/40 bg-background p-6 text-center">
                  <Upload className="mx-auto h-8 w-8 text-accent" />
                  <p className="mt-2 text-sm text-muted-foreground">Upload supporting documents directly — {meta.label} has no Auto package to pull from.</p>
                  <label className="mt-3 inline-block cursor-pointer">
                    <span className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">Choose files</span>
                    <input type="file" multiple className="hidden" onChange={handleFileSelect} />
                  </label>
                </div>
                {fileNames.length > 0 && (
                  <div className="rounded-md border bg-background divide-y">
                    {fileNames.map((name, i) => (
                      <div key={`${name}-${i}`} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                        <FileText className="h-4 w-4 text-primary" /><span className="flex-1">{name}</span><StatusBadge variant="success">Ready</StatusBadge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Recipient company">
                    <Select value={recipientCompany} onValueChange={setRecipientCompany}>
                      <SelectTrigger><SelectValue placeholder="Select a company" /></SelectTrigger>
                      <SelectContent>
                        {recipientCompanies.map((company) => <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Invite an external party by email (optional)">
                    <Input value={invitedEmail} onChange={(e) => setInvitedEmail(e.target.value)} placeholder="name@company.com" />
                  </Field>
                  <Field label="Permission scope">
                    <Select value={permissionScope} onValueChange={setPermissionScope}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="view">View only</SelectItem>
                        <SelectItem value="comment-evidence">Comment and evidence</SelectItem>
                        <SelectItem value="settlement">Comment, evidence, settlement</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field label="Message to recipient">
                  <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
                </Field>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <PackageFact icon={Building2} label="Origin app" value={meta.sourceApp} />
                  <PackageFact icon={FileText} label="Uploaded files" value={`${fileNames.length} documents`} />
                  <PackageFact icon={ShieldCheck} label="Entry stage" value="Negotiation (no assessment)" />
                  <PackageFact icon={CheckCircle2} label="Matter type" value={claimType} />
                </div>
                <div className="rounded-md border bg-background p-4">
                  <div className="font-medium">Notifications to trigger</div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div className="rounded-md border bg-card p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><UserPlus className="h-3.5 w-3.5 text-accent" /> Invite external party</div>
                      <div className="mt-1 text-sm font-medium">{invitedEmail || "None invited yet"}</div>
                    </div>
                    <div className="rounded-md border bg-card p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-accent" /> Audit event</div>
                      <div className="mt-1 text-sm font-medium">matrix.created (origin: {originApp})</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="rounded-md border border-accent/50 bg-accent/5 p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-accent text-accent-foreground"><CheckCircle2 className="h-7 w-7" /></div>
                <h2 className="mt-4 text-xl font-semibold">Matrix created</h2>
                <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                  Claim Matrix opened a negotiation-stage matter from {meta.sourceApp}, invited the recipient, triggered notifications, and logged the audit trail.
                </p>
                <Button asChild className="mt-5" variant="success"><Link to={createdMatrixId ? `/claims/${createdMatrixId}` : "/claims"}>Open the matrix</Link></Button>
              </div>
            )}

            {step < 5 && (
              <div className="flex items-center justify-between border-t pt-4">
                <Button type="button" variant="outline" disabled={step === 1} onClick={() => setStep((c) => Math.max(1, c - 1))}>Back</Button>
                <Button type="button" variant="success" disabled={submitting} onClick={() => (step >= 4 ? handleCreate() : setStep((c) => Math.min(5, c + 1)))}>
                  {step >= 4 ? (submitting ? "Sending…" : "Send to Claim Matrix") : "Continue"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card border-accent/50 h-fit">
          <CardHeader><CardTitle className="text-base">Review before sending</CardTitle></CardHeader>
          <CardContent>
            <DetailRow label="Origin app" value={meta.sourceApp} />
            <DetailRow label="Matter type" value={claimType} />
            <DetailRow label="Entry stage" value="Negotiation (no assessment)" />
            <DetailRow label="Documents" value={`${fileNames.length} uploaded`} />
            <DetailRow label="Recipient" value={recipientCompanies.find((c) => c.id === recipientCompany)?.name ?? "—"} />
            <DetailRow label="Wizard state" value={wizardTitle(step)} />
            <div className="mt-5 space-y-2">
              <Button type="button" className="w-full" onClick={handleCreate} disabled={submitting}><Send className="h-4 w-4" /> {submitting ? "Creating…" : "Create Matrix"}</Button>
              <Button asChild variant="outline" className="w-full"><Link to="/claims"><Mail className="h-4 w-4" /> Save draft</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
