import { useState, useEffect } from "react";
import { toast } from "sonner";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import Spinner from "@/components/shared/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Send, FileText, Calendar, MapPin, Plus, X } from "lucide-react";
import { getAutoClaims, sendAutoClaimToMatrix } from "@/services/claimService";
import { useCompanies } from "@/hooks/useCompanies";
import { useUsers } from "@/hooks/useUsers";
import { ApiError, pickList } from "@/services/api";

const initialForm = { recipientCompany: "", message: "" };

const STATUS_VARIANT = {
  NotSent: "muted",
  Sending: "info",
  Sent: "success",
  Failed: "danger",
};

function Field({ label, children, error }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default function ClaimPackages() {
  const { data: companiesData } = useCompanies();
  const companies = companiesData ?? [];
  const { data: usersData } = useUsers();
  const users = usersData ?? [];
  const [claims, setClaims] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sending, setSending] = useState(null); // the claim currently in the modal
  const [form, setForm] = useState(initialForm);
  const [recipients, setRecipients] = useState([]); // [{ email, name }]
  const [addRecipientEmail, setAddRecipientEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Local fetch (rather than a shared hook) so a successful send can trigger a
  // refetch via refreshKey and flip the row's status without a full page reload.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    getAutoClaims()
      .then((res) => {
        if (!controller.signal.aborted) setClaims(pickList(res).items);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [refreshKey]);

  function openSend(claim) {
    setSending(claim);
    setForm(initialForm);
    setRecipients([]);
    setAddRecipientEmail("");
    setFieldErrors({});
  }

  function closeSend() {
    setSending(null);
  }

  const setField = (key) => (value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Recipients are scoped to the selected company — a company change invalidates the picks.
    if (key === "recipientCompany") {
      setRecipients([]);
      setAddRecipientEmail("");
    }
  };

  // Only users whose company matches the selected recipient company can be invited —
  // that's the whole point of picking a company first.
  const companyUsers = form.recipientCompany
    ? users.filter((u) => u.company === form.recipientCompany)
    : [];
  const availableUsers = companyUsers.filter((u) => !recipients.some((r) => r.email === u.email));

  const addRecipient = () => {
    const user = availableUsers.find((u) => u.email === addRecipientEmail) ?? availableUsers[0];
    if (!user) return;
    setRecipients((r) => [...r, { email: user.email, name: user.name }]);
    setAddRecipientEmail("");
  };

  const removeRecipient = (email) => setRecipients((r) => r.filter((x) => x.email !== email));

  async function handleSend(e) {
    e.preventDefault();
    if (!sending) return;
    setFieldErrors({});
    setSubmitting(true);
    try {
      await sendAutoClaimToMatrix({
        toolkitId: sending.toolkitId,
        companyId: sending.companyId,
        recipientCompany: form.recipientCompany,
        invitedEmails: recipients.map((r) => r.email),
        message: form.message,
      });
      toast.success(
        `Sent claim ${sending.claimNumber} to Matrix — invitation emailed to ${recipients.length} recipient${recipients.length === 1 ? "" : "s"}`
      );
      closeSend();
      setRefreshKey((k) => k + 1);
    } catch (err) {
      if (err instanceof ApiError && err.fields) setFieldErrors(err.fields);
      toast.error(err?.message || "Unable to send this claim to Matrix");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Send to Matrix"
        subtitle="Live claims from Claim Toolkit Auto — send one to start a shared Claim Matrix"
      />

      <Card className="shadow-card border-accent/50">
        <CardContent className="p-0">
          <div className="px-5 py-4 border-b font-medium">Auto claims</div>
          {loading ? (
            <div className="p-6"><Spinner /></div>
          ) : error ? (
            <div className="p-6 text-sm text-destructive">{error.message || "Failed to load claims."}</div>
          ) : !claims || claims.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No claims available"
                body="Claims from Claim Toolkit Auto will appear here once they're available to send."
              />
            </div>
          ) : (
            <div className="divide-y">
              {claims.map((claim) => {
                const status = claim.matrixLinkStatus || "NotSent";
                const canSend = status === "NotSent" || status === "Failed";
                return (
                  <div key={`${claim.companyId}-${claim.toolkitId}`} className="p-4 hover:bg-muted/40">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-md bg-accent/15 text-accent flex items-center justify-center">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {claim.claimNumber || `Claim ${claim.toolkitId}`} — {claim.insuredName}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{claim.companyName}</div>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {claim.dateOfLoss && (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {new Date(claim.dateOfLoss).toLocaleDateString()}
                            </span>
                          )}
                          {claim.state && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {claim.state}
                            </span>
                          )}
                          {claim.accidentType && <span>{claim.accidentType}</span>}
                          {claim.claimStatus && <span>Status: {claim.claimStatus}</span>}
                        </div>
                        <div className="mt-2">
                          <StatusBadge variant={STATUS_VARIANT[status] || "muted"}>
                            {status === "Sent" && claim.matrixCode ? `Sent · ${claim.matrixCode}` : status}
                          </StatusBadge>
                          {status === "Failed" && claim.errorMessage && (
                            <span className="ml-2 text-xs text-destructive">{claim.errorMessage}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={canSend ? "default" : "outline"}
                        onClick={() => openSend(claim)}
                        disabled={!canSend}
                      >
                        <Send className="h-4 w-4" /> {status === "Failed" ? "Retry" : canSend ? "Send to Matrix" : "Sent"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={sending !== null} onOpenChange={(open) => !open && closeSend()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send to Matrix</DialogTitle>
          </DialogHeader>
          {sending && (
            <form className="space-y-4" onSubmit={handleSend}>
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <div className="font-medium">
                  {sending.claimNumber || `Claim ${sending.toolkitId}`} — {sending.insuredName}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{sending.companyName}</div>
              </div>
              <Field label="Recipient company" error={fieldErrors.recipientCompany}>
                <Select value={form.recipientCompany} onValueChange={setField("recipientCompany")}>
                  <SelectTrigger>
                    <SelectValue placeholder={companies.length ? "Select a company" : "No companies available"} />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Only existing companies can be selected here — new companies are added from Admin.
                </p>
              </Field>

              <Field label="Recipients" error={fieldErrors.invitedEmails}>
                {!form.recipientCompany ? (
                  <p className="text-xs text-muted-foreground">Select a recipient company first to see its users.</p>
                ) : (
                  <div className="rounded-md border bg-background p-3">
                    {recipients.length === 0 ? (
                      <div className="text-xs text-muted-foreground">No recipients selected yet.</div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {recipients.map((r) => (
                          <span key={r.email} className="inline-flex items-center gap-1.5 rounded-full border bg-muted/45 px-3 py-1 text-xs">
                            <span className="font-medium">{r.name}</span>
                            <span className="text-muted-foreground">{r.email}</span>
                            <button
                              type="button"
                              className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                              aria-label={`Remove ${r.name}`}
                              onClick={() => removeRecipient(r.email)}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                      <Select value={addRecipientEmail} onValueChange={setAddRecipientEmail}>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              companyUsers.length === 0
                                ? "No users found for this company"
                                : availableUsers.length === 0
                                  ? "All users added"
                                  : "Select a user to add"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {availableUsers.map((u) => (
                            <SelectItem key={u.id} value={u.email}>
                              {u.name} — {u.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="outline" onClick={addRecipient} disabled={availableUsers.length === 0}>
                        <Plus className="h-4 w-4" /> Add
                      </Button>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Only users belonging to the selected company are shown. Add one or more — each gets their own invitation email.
                    </p>
                  </div>
                )}
              </Field>

              <Field label="Message (optional)">
                <Textarea
                  rows={3}
                  placeholder="Add a note for the recipient…"
                  value={form.message}
                  onChange={(e) => setField("message")(e.target.value)}
                />
              </Field>
              <p className="text-xs text-muted-foreground">
                Each recipient will receive an email with a secure link to accept and join this
                claim in Matrix.
              </p>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={closeSend} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting || recipients.length === 0}>
                  <Send className="h-4 w-4" /> {submitting ? "Sending…" : "Send"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
