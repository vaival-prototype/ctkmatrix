import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import Stepper from "@/components/shared/Stepper";
import Spinner from "@/components/shared/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useClaimManagementCase } from "@/hooks/useClaimManagementCase";
import {
  updateClaimManagementStatus, updateAgreement, addParty, updateParty,
  addActivityNote, addDocument, addRelease,
} from "@/services/claimManagementService";
import {
  CM5_STATUS_STEPS, CM5_AGREEMENT_STAGES, CM5_DOCUMENT_CATEGORIES,
  CM5_PAYMENT_STATUSES, CM5_RELEASE_STATUSES,
} from "@/constants/claimManagement";
import {
  ArrowLeft, FileSignature, FileText, Handshake, Plus, Receipt,
  ShieldCheck, StickyNote, Upload, UserPlus, Users,
} from "lucide-react";

function statusVariant(status) {
  if (status === "Settled" || status === "Evaluated") return "success";
  if (status === "Offered" || status === "Countered") return "info";
  return "warning";
}

function currency(n) {
  const v = Number(n);
  if (!v && v !== 0) return "—";
  return v.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function SectionCard({ icon: Icon, title, action, children }) {
  return (
    <Card className="shadow-card border-accent/40">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2"><Icon className="h-4 w-4 text-accent" /> {title}</CardTitle>
          {action}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function ClaimManagementDetail() {
  const { caseId } = useParams();
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: cm5Case, loading, error } = useClaimManagementCase(caseId, refreshKey);

  const [partyDialogOpen, setPartyDialogOpen] = useState(false);
  const [partyName, setPartyName] = useState("");
  const [partyCompany, setPartyCompany] = useState("");
  const [partyEmail, setPartyEmail] = useState("");
  const [partyInjury, setPartyInjury] = useState("");
  const [partyAmount, setPartyAmount] = useState("");

  const [noteText, setNoteText] = useState("");
  const [docCategory, setDocCategory] = useState("Medical");
  const [releaseParty, setReleaseParty] = useState("");
  const [releaseStatus, setReleaseStatus] = useState("Pending");

  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  async function handleStatusChange(status) {
    try {
      await updateClaimManagementStatus(caseId, status);
      toast.success(`Status set to ${status}`);
      refresh();
    } catch (err) {
      toast.error(err.message || "Could not update status");
    }
  }

  async function handleAgreementAdvance() {
    const stages = CM5_AGREEMENT_STAGES;
    const currentIndex = stages.indexOf(cm5Case.agreement.status);
    const next = stages[Math.min(stages.length - 1, currentIndex + 1)];
    try {
      const patch = { status: next };
      if (next === "Sent for Signature" && !cm5Case.agreement.docusignEnvelopeId) {
        patch.docusignEnvelopeId = `DS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        patch.documentName = cm5Case.agreement.documentName || `${cm5Case.agreementType}-${cm5Case.id}.pdf`;
      }
      if (next === "Executed") patch.executedAt = new Date().toISOString();
      await updateAgreement(caseId, patch);
      toast.success(`Agreement moved to ${next}`);
      refresh();
    } catch (err) {
      toast.error(err.message || "Could not update the agreement");
    }
  }

  async function handleAddParty() {
    try {
      await addParty(caseId, {
        name: partyName,
        company: partyCompany,
        contactEmail: partyEmail,
        role: "Negligent free third party",
        injuryDescription: partyInjury,
        contributionAmount: partyAmount ? Number(partyAmount) : null,
      });
      toast.success("Third party added");
      setPartyDialogOpen(false);
      setPartyName(""); setPartyCompany(""); setPartyEmail(""); setPartyInjury(""); setPartyAmount("");
      refresh();
    } catch (err) {
      toast.error(err.message || "Could not add the party");
    }
  }

  async function handlePaymentStatus(partyId, paymentStatus) {
    try {
      await updateParty(caseId, partyId, { paymentStatus });
      toast.success("Payment status updated");
      refresh();
    } catch (err) {
      toast.error(err.message || "Could not update payment status");
    }
  }

  async function handleAddNote() {
    if (!noteText.trim()) return;
    try {
      await addActivityNote(caseId, noteText.trim());
      setNoteText("");
      refresh();
    } catch (err) {
      toast.error(err.message || "Could not add the note");
    }
  }

  async function handleFileSelect(e) {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      try {
        await addDocument(caseId, { name: f.name, category: docCategory });
      } catch (err) {
        toast.error(err.message || "Could not add the document");
      }
    }
    if (files.length) { toast.success(`${files.length} document(s) added`); refresh(); }
  }

  async function handleAddRelease() {
    if (!releaseParty) return;
    try {
      await addRelease(caseId, { party: releaseParty, status: releaseStatus, executedDate: releaseStatus === "Executed" ? new Date().toISOString() : null });
      toast.success("Release recorded");
      refresh();
    } catch (err) {
      toast.error(err.message || "Could not record the release");
    }
  }

  if (loading) return <Spinner />;
  if (error || !cm5Case) return <EmptyState title="Case not found" body={error ? error.message : "This claim management case could not be loaded."} />;

  const statusIndex = CM5_STATUS_STEPS.indexOf(cm5Case.status);
  const nextAgreementStage = CM5_AGREEMENT_STAGES[Math.min(CM5_AGREEMENT_STAGES.length - 1, CM5_AGREEMENT_STAGES.indexOf(cm5Case.agreement.status) + 1)];
  const agreementDone = cm5Case.agreement.status === "Executed";

  return (
    <>
      <PageHeader
        title={cm5Case.title}
        subtitle={`${cm5Case.leadCompany} · ${cm5Case.agreementType} · Contribution (UC5)`}
        actions={<Button asChild variant="outline" size="sm"><Link to="/claim-management"><ArrowLeft className="h-4 w-4" /> Claim Management</Link></Button>}
      />

      <Card className="mb-5 shadow-card border-accent/50">
        <CardContent className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <StatusBadge variant={statusVariant(cm5Case.status)}>{cm5Case.status}</StatusBadge>
              {cm5Case.relatedMatrixId && <span className="text-xs text-muted-foreground">Linked to matrix {cm5Case.relatedMatrixId}</span>}
            </div>
            <div className="w-56">
              <Select value={cm5Case.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Change status" /></SelectTrigger>
                <SelectContent>
                  {CM5_STATUS_STEPS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Stepper steps={CM5_STATUS_STEPS} current={statusIndex} />
          {cm5Case.status === "Evaluated" && (
            <div className="mt-3 text-xs text-muted-foreground">Once evaluated, all parties agree on offers and counter-offers and know the amount they will owe up front.</div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <SectionCard
          icon={FileSignature}
          title={`Agreement — ${cm5Case.agreementType}`}
          action={<StatusBadge variant={agreementDone ? "success" : "warning"}>{cm5Case.agreement.status}</StatusBadge>}
        >
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Document</span><span className="font-medium">{cm5Case.agreement.documentName || "Not yet drafted"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">DocuSign envelope</span><span className="font-medium">{cm5Case.agreement.docusignEnvelopeId || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Executed</span><span className="font-medium">{cm5Case.agreement.executedAt ? new Date(cm5Case.agreement.executedAt).toLocaleDateString() : "Not yet"}</span></div>
          </div>
          {!agreementDone && (
            <Button size="sm" variant="success" className="mt-4" onClick={handleAgreementAdvance}>
              <FileSignature className="h-4 w-4" /> {cm5Case.agreement.status === "Draft" ? "Send for signature" : `Advance to ${nextAgreementStage}`}
            </Button>
          )}
        </SectionCard>

        <SectionCard
          icon={Handshake}
          title="Case lead"
        >
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Lead company</span><span className="font-medium">{cm5Case.leadCompany}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Opened</span><span className="font-medium">{new Date(cm5Case.createdAt).toLocaleDateString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Last updated</span><span className="font-medium">{new Date(cm5Case.updatedAt).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Parties tracked</span><span className="font-medium">{cm5Case.parties.length}</span></div>
          </div>
        </SectionCard>

        <SectionCard
          icon={Users}
          title="Party information & injury description"
          action={<Button size="sm" variant="outline" onClick={() => setPartyDialogOpen(true)}><UserPlus className="h-4 w-4" /> Add party</Button>}
        >
          {cm5Case.parties.length === 0 ? (
            <div className="text-sm text-muted-foreground">No negligent free third parties tracked yet.</div>
          ) : (
            <div className="space-y-3">
              {cm5Case.parties.map((party) => (
                <div key={party.id} className="rounded-md border bg-background p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold">{party.name} <span className="font-normal text-muted-foreground">· {party.company}</span></div>
                    <span className="text-xs text-muted-foreground">{party.contactEmail}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{party.role}</div>
                  {party.injuryDescription && <div className="mt-2 text-sm leading-relaxed">{party.injuryDescription}</div>}
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard icon={Receipt} title="Payment management">
          {cm5Case.parties.length === 0 ? (
            <div className="text-sm text-muted-foreground">Add parties to track contribution and payment status.</div>
          ) : (
            <div className="divide-y">
              {cm5Case.parties.map((party) => (
                <div key={party.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <div>
                    <div className="text-sm font-medium">{party.name}</div>
                    <div className="text-xs text-muted-foreground">Contribution: {currency(party.contributionAmount)}</div>
                  </div>
                  <div className="w-40">
                    <Select value={party.paymentStatus} onValueChange={(v) => handlePaymentStatus(party.id, v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CM5_PAYMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard icon={ShieldCheck} title="Release management">
          <div className="space-y-3">
            {cm5Case.releases.length === 0 ? (
              <div className="text-sm text-muted-foreground">No settlement releases recorded yet.</div>
            ) : (
              <div className="divide-y">
                {cm5Case.releases.map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-2 text-sm">
                    <span>{r.party}</span>
                    <StatusBadge variant={r.status === "Executed" ? "success" : "warning"}>{r.status}</StatusBadge>
                  </div>
                ))}
              </div>
            )}
            {cm5Case.parties.length > 0 && (
              <div className="grid grid-cols-[1fr_120px_auto] gap-2 items-end border-t pt-3">
                <div>
                  <Label className="text-xs">Party</Label>
                  <Select value={releaseParty} onValueChange={setReleaseParty}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select party" /></SelectTrigger>
                    <SelectContent>
                      {cm5Case.parties.map((p) => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={releaseStatus} onValueChange={setReleaseStatus}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CM5_RELEASE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" variant="outline" onClick={handleAddRelease}><Plus className="h-4 w-4" /> Add</Button>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard icon={FileText} title="Secure document management">
          <div className="space-y-3">
            {cm5Case.documents.length === 0 ? (
              <div className="text-sm text-muted-foreground">No documents uploaded yet.</div>
            ) : (
              <div className="divide-y">
                {cm5Case.documents.map((d) => (
                  <div key={d.id} className="flex items-center justify-between py-2 text-sm">
                    <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> {d.name}</div>
                    <StatusBadge variant="muted">{d.category}</StatusBadge>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2 border-t pt-3">
              <div className="flex-1">
                <Label className="text-xs">Category</Label>
                <Select value={docCategory} onValueChange={setDocCategory}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CM5_DOCUMENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <label className="cursor-pointer">
                <span className="inline-flex h-9 items-center gap-2 rounded-md bg-accent px-3 text-sm font-medium text-accent-foreground"><Upload className="h-4 w-4" /> Upload</span>
                <input type="file" multiple className="hidden" onChange={handleFileSelect} />
              </label>
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={StickyNote} title="Activity notes">
          <div className="space-y-3">
            {cm5Case.activityNotes.length === 0 ? (
              <div className="text-sm text-muted-foreground">No activity logged yet.</div>
            ) : (
              <div className="space-y-2">
                {cm5Case.activityNotes.slice().reverse().map((n) => (
                  <div key={n.id} className="rounded-md border bg-background p-3 text-sm">
                    <div className="flex justify-between text-xs text-muted-foreground"><span>{n.author}</span><span>{new Date(n.date).toLocaleString()}</span></div>
                    <div className="mt-1">{n.note}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 border-t pt-3">
              <Textarea rows={2} value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Log an update on this case…" className="flex-1" />
              <Button size="sm" variant="outline" onClick={handleAddNote}><Plus className="h-4 w-4" /> Add</Button>
            </div>
          </div>
        </SectionCard>
      </div>

      <Dialog open={partyDialogOpen} onOpenChange={setPartyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add negligent free third party</DialogTitle>
            <DialogDescription>Track a third party's information and injury as part of this {cm5Case.agreementType}.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tp-name">Name</Label>
              <Input id="tp-name" value={partyName} onChange={(e) => setPartyName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tp-company">Company</Label>
              <Input id="tp-company" value={partyCompany} onChange={(e) => setPartyCompany(e.target.value)} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="tp-email">Contact email</Label>
              <Input id="tp-email" type="email" value={partyEmail} onChange={(e) => setPartyEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tp-amount">Contribution amount</Label>
              <Input id="tp-amount" type="number" min="0" value={partyAmount} onChange={(e) => setPartyAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="tp-injury">Injury description</Label>
              <Textarea id="tp-injury" rows={3} value={partyInjury} onChange={(e) => setPartyInjury(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="success" disabled={!partyName.trim()} onClick={handleAddParty}>Add party</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
