import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useAccessTier } from "@/hooks/useAccessTier";
import { createUpgradeRequest } from "@/services/accessService";
import { CheckCircle2, FileText, Receipt, ShieldCheck } from "lucide-react";

export default function UpgradeRequest() {
  const { user } = useAuth();
  const { capabilities } = useAccessTier();
  const [billingPreference, setBillingPreference] = useState("per-claim");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await createUpgradeRequest({ requestedTier: "matrix-paid", billingPreference, note });
      setSubmitted(true);
      toast.success("Upgrade request sent");
    } catch (err) {
      toast.error(err.message || "Could not submit the request");
    } finally {
      setSubmitting(false);
    }
  }

  if (capabilities.initiate) {
    return (
      <>
        <PageHeader title="Upgrade access" subtitle="Your account can already initiate matrices." />
        <Card className="shadow-card border-accent/50"><CardContent className="p-6 text-sm text-muted-foreground">Nothing to upgrade — {user?.name} already has initiator access on the {user?.tier} tier.</CardContent></Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Request initiator access"
        subtitle="Free receivers can view, comment, respond, and upload evidence. Upgrading lets you initiate matrices of your own."
        actions={<StatusBadge variant="warning">Current tier: Matrix Free (Receiver)</StatusBadge>}
      />

      {submitted ? (
        <Card className="border-accent/50 bg-accent/5 shadow-card">
          <CardContent className="p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-accent text-accent-foreground"><CheckCircle2 className="h-7 w-7" /></div>
            <h2 className="mt-4 text-xl font-semibold">Request submitted</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              An admin will review your request, send an invoice for the plan you chose, and activate initiator access once it's settled — the same billing lifecycle used for company accounts, not a separate payment flow.
            </p>
            <Button asChild className="mt-5" variant="outline"><Link to="/dashboard">Back to dashboard</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <Card className="xl:col-span-2 shadow-card border-accent/50">
            <CardHeader><CardTitle className="text-base">Choose a billing preference</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <RadioGroup value={billingPreference} onValueChange={setBillingPreference} className="grid grid-cols-1 gap-3">
                <label className="flex cursor-pointer items-start gap-3 rounded-md border bg-background p-4 hover:border-accent">
                  <RadioGroupItem value="per-claim" className="mt-1" />
                  <div>
                    <div className="font-semibold">Per-claim invoice</div>
                    <div className="mt-1 text-xs text-muted-foreground">Pay a fee against each claim file you initiate. No subscription — an invoice is generated per matrix.</div>
                  </div>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-md border bg-background p-4 hover:border-accent">
                  <RadioGroupItem value="company-license" className="mt-1" />
                  <div>
                    <div className="font-semibold">Company license</div>
                    <div className="mt-1 text-xs text-muted-foreground">A flat fee covers unlimited initiation for everyone at your company, billed the same way as a Claim Toolkit company account.</div>
                  </div>
                </label>
              </RadioGroup>
              <div className="space-y-1.5">
                <Label className="text-xs">Note to the review team (optional)</Label>
                <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything the review team should know." />
              </div>
              <Button className="w-full" variant="success" disabled={submitting} onClick={handleSubmit}>{submitting ? "Submitting…" : "Submit upgrade request"}</Button>
            </CardContent>
          </Card>

          <Card className="shadow-card border-accent/50 h-fit">
            <CardContent className="p-5 space-y-3">
              <div className="font-medium">What changes once approved</div>
              {[
                [FileText, "Initiate a matrix directly, same as a Compliance user"],
                [ShieldCheck, "Invite external parties and manage permissions"],
                [Receipt, "Billed by invoice — no card on file, no self-serve checkout"],
              ].map(([Icon, label]) => (
                <div key={label} className="flex items-start gap-2 text-sm"><Icon className="mt-0.5 h-4 w-4 text-accent" /><span>{label}</span></div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
