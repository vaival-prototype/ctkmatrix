import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import Spinner from "@/components/shared/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAccessRequests } from "@/hooks/useAccessRequests";
import { useUpgradeRequests } from "@/hooks/useUpgradeRequests";
import { useCompanies } from "@/hooks/useCompanies";
import { decideAccessRequest, decideUpgradeRequest } from "@/services/accessService";

function formatDate(iso) {
  return iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";
}

function statusVariant(status) {
  if (status === "Approved") return "success";
  if (status === "Rejected") return "danger";
  return "warning";
}

function RejectDialog({ target, onClose, onConfirm }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject {target?.name}?</DialogTitle>
          <DialogDescription>
            {target?.kind === "access" && target?.source === "invite"
              ? `Their invitation is cancelled and ${target.invitedBy} sees “Rejected” next to their name.`
              : "They're told the request was declined."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="reject-note">Reason (optional, shared with them)</Label>
          <Textarea id="reject-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              const done = await onConfirm(note.trim());
              setSaving(false);
              if (done) setNote("");
            }}
          >
            {saving ? "Rejecting…" : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ApproveAccessDialog({ request, companies, onClose, onConfirm }) {
  const match = companies.find((c) => c.name.toLowerCase() === (request?.company ?? "").toLowerCase());
  const [mode, setMode] = useState(match ? "existing" : "new");
  const [companyId, setCompanyId] = useState(match?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (mode === "existing" && !companyId) {
      setError("Choose the company to link them to");
      return;
    }
    setSaving(true);
    const done = await onConfirm({ companyMode: mode, companyId: mode === "existing" ? companyId : undefined });
    setSaving(false);
    if (!done) setError("");
  }

  return (
    <Dialog open={!!request} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve {request?.name}</DialogTitle>
          <DialogDescription>
            They get a Level 1 account and an email with a link to set their password.
          </DialogDescription>
        </DialogHeader>
        <RadioGroup value={mode} onValueChange={(v) => { setMode(v); setError(""); }} className="space-y-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:border-accent">
            <RadioGroupItem value="new" className="mt-0.5" disabled={!!match} />
            <div className="text-sm">
              <div className="font-medium">Add as a new company: {request?.company}</div>
              <div className="text-xs text-muted-foreground">
                {match ? "A company with this name already exists — link to it instead." : "Creates the company in Claim Matrix."}
              </div>
            </div>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:border-accent">
            <RadioGroupItem value="existing" className="mt-0.5" />
            <div className="w-full space-y-2 text-sm">
              <div className="font-medium">Link to an existing company</div>
              {mode === "existing" && (
                <Select value={companyId} onValueChange={(v) => { setCompanyId(v); setError(""); }}>
                  <SelectTrigger aria-label="Company">
                    <SelectValue placeholder="Choose a company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </label>
        </RadioGroup>
        {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Approving…" : "Approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ApproveUpgradeDialog({ request, onClose, onConfirm }) {
  const [level, setLevel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!level) {
      setError("Choose Level 2 or Level 3");
      return;
    }
    setSaving(true);
    const done = await onConfirm(level);
    setSaving(false);
    if (done) setLevel("");
  }

  return (
    <Dialog open={!!request} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upgrade {request?.name}</DialogTitle>
          <DialogDescription>Choose their new level. This applies inside Claim Matrix only.</DialogDescription>
        </DialogHeader>
        <RadioGroup value={level} onValueChange={(v) => { setLevel(v); setError(""); }} className="space-y-2">
          {[
            ["level2", "Level 2", "Starts a Matrix by manual entry, invites people, some Ask CTK tools."],
            ["level3", "Level 3", "Everything in Level 2, plus editing the Assessment and all Ask CTK tools."],
          ].map(([value, title, text]) => (
            <label key={value} className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:border-accent">
              <RadioGroupItem value={value} className="mt-0.5" />
              <div className="text-sm">
                <div className="font-medium">{title}</div>
                <div className="text-xs text-muted-foreground">{text}</div>
              </div>
            </label>
          ))}
        </RadioGroup>
        {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Approving…" : "Approve upgrade"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RequestRow({ title, lines, status, onApprove, onReject }) {
  const pending = status === "Pending review";
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{title}</span>
          <StatusBadge variant={statusVariant(status)}>{pending ? "Waiting for review" : status}</StatusBadge>
        </div>
        {lines.filter(Boolean).map((line, i) => (
          <div key={i} className="text-xs text-muted-foreground">
            {line}
          </div>
        ))}
      </div>
      {pending && (
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="outline" onClick={onReject}>
            <X className="h-4 w-4" /> Reject
          </Button>
          <Button size="sm" onClick={onApprove}>
            <Check className="h-4 w-4" /> Approve
          </Button>
        </div>
      )}
    </div>
  );
}

/** The single approvals inbox for the Admin and Approvers: Request Access + upgrades. */
export default function Approvals() {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);
  const access = useAccessRequests(refreshKey);
  const upgrades = useUpgradeRequests(refreshKey);
  // Refetched after each decision: approving can create a new company.
  const { data: companiesData } = useCompanies(refreshKey);
  const companies = companiesData ?? [];

  const [approvingAccess, setApprovingAccess] = useState(null);
  const [approvingUpgrade, setApprovingUpgrade] = useState(null);
  const [rejecting, setRejecting] = useState(null);

  const accessItems = access.data ?? [];
  const upgradeItems = upgrades.data ?? [];
  const pendingAccess = accessItems.filter((r) => r.status === "Pending review").length;
  const pendingUpgrades = upgradeItems.filter((r) => r.status === "Pending review").length;

  async function run(action, success) {
    try {
      await action();
      toast.success(success);
      refresh();
      return true;
    } catch (err) {
      toast.error(err.message || "Something went wrong");
      return false;
    }
  }

  function renderList(state, items, empty, renderItem) {
    if (state.loading) return <Spinner />;
    if (state.error) return <EmptyState title="Couldn't load requests" body={state.error.message} />;
    if (items.length === 0) return <EmptyState title="Nothing here" body={empty} />;
    return (
      <Card className="shadow-card border-accent/50">
        <CardContent className="divide-y p-0">{items.map(renderItem)}</CardContent>
      </Card>
    );
  }

  return (
    <>
      <PageHeader title="Approvals" subtitle="Access requests and Level 1 upgrade requests waiting for a decision" />

      <Tabs defaultValue="access">
        <TabsList className="bg-card border">
          <TabsTrigger value="access">Access requests{pendingAccess ? ` (${pendingAccess})` : ""}</TabsTrigger>
          <TabsTrigger value="upgrades">Upgrade requests{pendingUpgrades ? ` (${pendingUpgrades})` : ""}</TabsTrigger>
        </TabsList>

        <TabsContent value="access" className="mt-4">
          {renderList(access, accessItems, "New Request Access submissions will appear here.", (r) => (
            <RequestRow
              key={r.id}
              title={`${r.name} · ${r.company}`}
              status={r.status}
              lines={[
                `${r.email} · requested ${formatDate(r.requestedAt)}`,
                r.source === "invite" ? (
                  <>
                    Invited by {r.invitedBy} to{" "}
                    <Link className="text-accent hover:underline" to={`/claims/${r.claimId}`}>
                      {r.claimId}
                    </Link>
                  </>
                ) : (
                  "Requested access without an invitation"
                ),
                r.reason && `“${r.reason}”`,
                r.status !== "Pending review" &&
                  `${r.status} by ${r.decidedBy ?? "—"}${r.companyName ? ` · company: ${r.companyName}` : ""}${r.note ? ` · “${r.note}”` : ""}`,
              ]}
              onApprove={() => setApprovingAccess(r)}
              onReject={() => setRejecting({ ...r, kind: "access" })}
            />
          ))}
        </TabsContent>

        <TabsContent value="upgrades" className="mt-4">
          {renderList(upgrades, upgradeItems, "Level 1 users' upgrade requests will appear here.", (r) => (
            <RequestRow
              key={r.id}
              title={`${r.name} · ${r.company}`}
              status={r.status}
              lines={[
                `${r.email} · ${r.status === "Pending review" ? "currently" : "was"} Level 1 · requested ${formatDate(r.requestedAt)}`,
                r.note && `“${r.note}”`,
                r.status === "Approved" && `Upgraded to ${r.approvedLevel === "level3" ? "Level 3" : "Level 2"} by ${r.decidedBy}`,
                r.status === "Rejected" && `Rejected by ${r.decidedBy}`,
              ]}
              onApprove={() => setApprovingUpgrade(r)}
              onReject={() => setRejecting({ ...r, kind: "upgrade" })}
            />
          ))}
        </TabsContent>
      </Tabs>

      <ApproveAccessDialog
        key={approvingAccess?.id ?? "none"}
        request={approvingAccess}
        companies={companies}
        onClose={() => setApprovingAccess(null)}
        onConfirm={async (choice) => {
          const done = await run(
            () => decideAccessRequest(approvingAccess.id, { decision: "approve", ...choice }),
            `${approvingAccess.name} approved — set-password email sent`
          );
          if (done) setApprovingAccess(null);
          return done;
        }}
      />
      <ApproveUpgradeDialog
        key={approvingUpgrade?.id ?? "none-u"}
        request={approvingUpgrade}
        onClose={() => setApprovingUpgrade(null)}
        onConfirm={async (level) => {
          const done = await run(
            () => decideUpgradeRequest(approvingUpgrade.id, { decision: "approve", level }),
            `${approvingUpgrade.name} upgraded`
          );
          if (done) setApprovingUpgrade(null);
          return done;
        }}
      />
      <RejectDialog
        target={rejecting}
        onClose={() => setRejecting(null)}
        onConfirm={async (note) => {
          const call =
            rejecting.kind === "access"
              ? () => decideAccessRequest(rejecting.id, { decision: "reject", note })
              : () => decideUpgradeRequest(rejecting.id, { decision: "reject", note });
          const done = await run(call, `${rejecting.name}'s request rejected`);
          if (done) setRejecting(null);
          return done;
        }}
      />
    </>
  );
}
