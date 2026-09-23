import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import Spinner from "@/components/shared/Spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useUpgradeRequests } from "@/hooks/useUpgradeRequests";
import { useInvoices } from "@/hooks/useInvoices";
import { decideUpgradeRequest, createInvoice, updateInvoice } from "@/services/accessService";
import { ArrowLeft, CheckCircle2, Plus, Receipt, Trash2, XCircle } from "lucide-react";

function statusVariant(status) {
  if (status === "Activated") return "success";
  if (status === "Invoice sent") return "info";
  if (status === "Declined") return "danger";
  return "warning";
}

function invoiceStatusVariant(status) {
  if (status === "Paid") return "success";
  if (status === "Sent") return "info";
  return "warning";
}

const TIER_LABELS = { "matrix-paid": "Matrix Paid", "matrix-free": "Matrix Free", auto: "Auto", compliance: "Compliance", audit: "Audit" };

const TIER_PRICING = {
  "matrix-paid": { description: "Claim Matrix — Matrix Paid initiator access (per-claim billing)", unitPrice: 450 },
};

function defaultLineItems(tier) {
  const p = TIER_PRICING[tier] || { description: `Claim Matrix — ${TIER_LABELS[tier] || tier} upgrade`, unitPrice: 450 };
  return [{ id: "li-1", description: p.description, qty: 1, unitPrice: p.unitPrice }];
}

function currency(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

function InvoiceDialog({ open, onOpenChange, request, invoice, onSaved }) {
  const [billToName, setBillToName] = useState("");
  const [billToEmail, setBillToEmail] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [lineItems, setLineItems] = useState([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    if (!request) return;
    if (invoice) {
      setBillToName(invoice.billToName || request.requesterName);
      setBillToEmail(invoice.billToEmail || request.requesterEmail);
      setDueDate(invoice.dueDate || defaultDueDate());
      setLineItems(invoice.lineItems && invoice.lineItems.length ? invoice.lineItems : defaultLineItems(request.requestedTier));
      setNotes(invoice.notes ?? `Upgrade to ${TIER_LABELS[request.requestedTier] || request.requestedTier} — billing preference: ${request.billingPreference === "per-claim" ? "per-claim invoice" : "company license"}.`);
    } else {
      setBillToName(request.requesterName);
      setBillToEmail(request.requesterEmail);
      setDueDate(defaultDueDate());
      setLineItems(defaultLineItems(request.requestedTier));
      setNotes(`Upgrade to ${TIER_LABELS[request.requestedTier] || request.requestedTier} — billing preference: ${request.billingPreference === "per-claim" ? "per-claim invoice" : "company license"}.`);
    }
  }, [request, invoice]);

  const total = useMemo(
    () => lineItems.reduce((sum, li) => sum + (Number(li.qty) || 0) * (Number(li.unitPrice) || 0), 0),
    [lineItems],
  );

  function updateLine(id, field, value) {
    setLineItems((prev) => prev.map((li) => (li.id === id ? { ...li, [field]: value } : li)));
  }

  function addLine() {
    setLineItems((prev) => [...prev, { id: `li-${prev.length + 1}-${Date.now().toString(36).slice(-3)}`, description: "", qty: 1, unitPrice: 0 }]);
  }

  function removeLine(id) {
    setLineItems((prev) => (prev.length > 1 ? prev.filter((li) => li.id !== id) : prev));
  }

  async function persist(status, successMessage) {
    if (!request) return;
    setSaving(status);
    try {
      const payload = { upgradeRequestId: request.id, company: request.company, billToName, billToEmail, lineItems, notes, dueDate, status };
      let saved;
      if (invoice) {
        saved = (await updateInvoice(invoice.id, payload)).data;
      } else {
        saved = (await createInvoice(payload)).data;
      }
      if (status === "Sent") {
        await decideUpgradeRequest(request.id, "invoice");
      }
      toast.success(successMessage);
      onSaved(saved);
      if (status === "Sent" || status === "Paid") onOpenChange(false);
    } catch (err) {
      toast.error(err.message || "Could not save the invoice");
    } finally {
      setSaving(null);
    }
  }

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4" /> {invoice ? invoice.invoiceNumber : "New invoice"}
            {invoice && <StatusBadge variant={invoiceStatusVariant(invoice.status)}>{invoice.status}</StatusBadge>}
          </DialogTitle>
          <DialogDescription>
            {request.company} · upgrading {request.requesterName} to {TIER_LABELS[request.requestedTier] || request.requestedTier}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="inv-bill-name">Bill to</Label>
            <Input id="inv-bill-name" value={billToName} onChange={(e) => setBillToName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="inv-bill-email">Billing email</Label>
            <Input id="inv-bill-email" type="email" value={billToEmail} onChange={(e) => setBillToEmail(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="inv-due">Due date</Label>
            <Input id="inv-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="mt-1" />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label>Line items</Label>
            <Button type="button" size="sm" variant="outline" onClick={addLine}><Plus className="h-3.5 w-3.5" /> Add line</Button>
          </div>
          <div className="space-y-2">
            {lineItems.map((li) => (
              <div key={li.id} className="grid grid-cols-[1fr_60px_100px_28px] gap-2 items-center">
                <Input value={li.description} onChange={(e) => updateLine(li.id, "description", e.target.value)} placeholder="Description" />
                <Input type="number" min="1" value={li.qty} onChange={(e) => updateLine(li.id, "qty", e.target.value)} />
                <Input type="number" min="0" step="0.01" value={li.unitPrice} onChange={(e) => updateLine(li.id, "unitPrice", e.target.value)} />
                <button type="button" onClick={() => removeLine(li.id)} className="text-muted-foreground hover:text-destructive" aria-label="Remove line">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-end border-t pt-3">
            <div className="text-sm"><span className="text-muted-foreground">Total: </span><span className="font-semibold">{currency(total)}</span></div>
          </div>
        </div>

        <div>
          <Label htmlFor="inv-notes">Notes</Label>
          <Textarea id="inv-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" rows={3} />
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={!!saving} onClick={() => persist("Draft", "Draft saved")}>
            {saving === "Draft" ? "Saving..." : "Save draft"}
          </Button>
          {invoice?.status === "Sent" && (
            <Button variant="success" disabled={!!saving} onClick={() => persist("Paid", "Invoice marked as paid")}>
              {saving === "Paid" ? "Saving..." : <><CheckCircle2 className="h-4 w-4" /> Mark as paid</>}
            </Button>
          )}
          {invoice?.status !== "Paid" && (
            <Button variant="success" disabled={!!saving} onClick={() => persist("Sent", "Invoice sent")}>
              {saving === "Sent" ? "Sending..." : <><Receipt className="h-4 w-4" /> {invoice?.status === "Sent" ? "Resend invoice" : "Send invoice"}</>}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminUpgradeRequests() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, loading, error } = useUpgradeRequests(refreshKey);
  const [invoiceRefreshKey, setInvoiceRefreshKey] = useState(0);
  const { data: invoicesData } = useInvoices(undefined, invoiceRefreshKey);
  const [actingId, setActingId] = useState(null);
  const [invoiceDialogFor, setInvoiceDialogFor] = useState(null);
  const rows = data ?? [];
  const invoices = invoicesData ?? [];

  function invoiceFor(requestId) {
    return invoices.find((i) => i.upgradeRequestId === requestId) ?? null;
  }

  async function act(id, decision, label) {
    setActingId(id);
    try {
      await decideUpgradeRequest(id, decision);
      toast.success(label);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err.message || "Could not update the request");
    } finally {
      setActingId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Upgrade requests"
        subtitle="Free receivers asking to become paid initiators — invoice, then activate, in the same lifecycle as company billing"
        actions={<Button asChild variant="outline" size="sm"><Link to="/admin/company-enablement"><ArrowLeft className="h-4 w-4" /> Admin</Link></Button>}
      />

      <Card className="shadow-card border-accent/50 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6"><Spinner /></div>
          ) : error || rows.length === 0 ? (
            <div className="p-6"><EmptyState title="No upgrade requests" body={error ? error.message : "No one has requested initiator access yet."} /></div>
          ) : (
            <div className="divide-y">
              {rows.map((r) => {
                const inv = invoiceFor(r.id);
                return (
                  <div key={r.id} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{r.requesterName} <span className="font-normal text-muted-foreground">· {r.requesterEmail}</span></div>
                        <div className="mt-1 text-sm text-muted-foreground">{r.company} · requesting <span className="font-medium text-foreground">{r.requestedTier}</span> · {r.billingPreference === "per-claim" ? "per-claim invoice" : "company license"}</div>
                        {r.note && <div className="mt-2 text-sm italic text-muted-foreground">"{r.note}"</div>}
                        {inv && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <Receipt className="h-3.5 w-3.5" /> {inv.invoiceNumber} · {currency(inv.lineItems.reduce((s, li) => s + (Number(li.qty) || 0) * (Number(li.unitPrice) || 0), 0))}
                            <StatusBadge variant={invoiceStatusVariant(inv.status)}>{inv.status}</StatusBadge>
                          </div>
                        )}
                      </div>
                      <StatusBadge variant={statusVariant(r.status)}>{r.status}</StatusBadge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setInvoiceDialogFor(r)}>
                        <Receipt className="h-4 w-4" /> {inv ? "View / edit invoice" : "Send invoice"}
                      </Button>
                      <Button size="sm" variant="success" disabled={actingId === r.id || r.status === "Activated"} onClick={() => act(r.id, "activate", "Initiator access activated")}>
                        <CheckCircle2 className="h-4 w-4" /> Activate
                      </Button>
                      <Button size="sm" variant="outline" disabled={actingId === r.id || r.status === "Declined"} onClick={() => act(r.id, "decline", "Request declined")}>
                        <XCircle className="h-4 w-4" /> Decline
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <InvoiceDialog
        open={!!invoiceDialogFor}
        onOpenChange={(open) => !open && setInvoiceDialogFor(null)}
        request={invoiceDialogFor}
        invoice={invoiceDialogFor ? invoiceFor(invoiceDialogFor.id) : null}
        onSaved={() => {
          setInvoiceRefreshKey((k) => k + 1);
          setRefreshKey((k) => k + 1);
        }}
      />
    </>
  );
}
