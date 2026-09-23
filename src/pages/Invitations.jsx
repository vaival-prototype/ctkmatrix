import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import Spinner from "@/components/shared/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Clock, Mail, Search, Send, Save, UserPlus, X } from "lucide-react";
import { useInvitations } from "@/hooks/useInvitations";
import { useClaims } from "@/hooks/useClaims";
import { usePermissions } from "@/hooks/usePermissions";
import { createInvitation } from "@/services/invitationService";
import { ApiError } from "@/services/api";

const inviteResolutionSteps = [
  { title: "Email entered", body: "Adjuster enters the recipient email and matrix scope.", icon: Mail },
  { title: "User lookup", body: "Claim Matrix checks mapped Claim Toolkit users and local users.", icon: Search },
  { title: "Existing user", body: "Access is granted and the user is notified.", icon: CheckCircle2 },
  { title: "New user", body: "Secure invitation email is sent for registration.", icon: UserPlus },
  { title: "Join matrix", body: "Recipient opens the Matrix after sign-in.", icon: Send },
];

function Field({ label, children, error }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

const initialForm = {
  email: "",
  company: "",
  role: "external-adjuster",
  permissionScope: "comment",
  matrixId: "",
  expiration: "14",
  message: "",
};

export default function Invitations() {
  const navigate = useNavigate();
  const { data: invitations, loading, error } = useInvitations();
  const { data: claims } = useClaims();
  const { can } = usePermissions();
  const canInvite = can("invite-external-user");

  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const claimOptions = claims ?? [];
  const setField = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!form.matrixId && claimOptions.length) setField("matrixId")(claimOptions[0].id);
  }, [claimOptions, form.matrixId]);

  async function handleSend(e) {
    e.preventDefault();
    if (!canInvite) return;
    setFieldErrors({});
    setSubmitting(true);
    try {
      const res = await createInvitation(form);
      const data = res?.data;
      toast.success(
        data?.status === "Accepted"
          ? "This user already had an account — access was granted instantly."
          : "Invitation sent"
      );
      setForm(initialForm);
      const newId = data?.id;
      if (newId) navigate(`/invitations/${newId}`);
    } catch (err) {
      if (err instanceof ApiError && err.fields) setFieldErrors(err.fields);
      toast.error(err?.message || "Unable to send invitation");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Invitations"
        subtitle="Invite external participants and manage permission scopes"
        actions={<Button size="sm" onClick={handleSend} disabled={submitting || !canInvite}><Send className="h-4 w-4" /> Send invitation</Button>}
      />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <Card className="shadow-card border-accent/50 xl:col-span-3">
          <CardContent className="p-6 space-y-5">
            <div>
              <h3 className="font-semibold">Invite participant</h3>
              <p className="text-sm text-muted-foreground">External users will receive a secure link scoped to a single matrix.</p>
            </div>
            {!canInvite && (
              <div className="rounded-md border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
                Your role does not have permission to invite external users.
              </div>
            )}
            <form className="grid grid-cols-2 gap-4" onSubmit={handleSend}>
              <Field label="Recipient email" error={fieldErrors.email}>
                <Input placeholder="name@firm.com" type="email" value={form.email} onChange={(e) => setField("email")(e.target.value)} />
              </Field>
              <Field label="Company / organization" error={fieldErrors.company}>
                <Input placeholder="Harbor Legal" value={form.company} onChange={(e) => setField("company")(e.target.value)} />
              </Field>
              <Field label="Role">
                <Select value={form.role} onValueChange={setField("role")}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["External Adjuster","Viewer","Supervisor","External Counsel"].map(r => <SelectItem key={r} value={r.toLowerCase().replace(/ /g,"-")}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Permission scope">
                <Select value={form.permissionScope} onValueChange={setField("permissionScope")}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="read">Read-only</SelectItem><SelectItem value="comment">Comment & evidence</SelectItem>
                    <SelectItem value="negotiate">Negotiate & propose</SelectItem><SelectItem value="admin">Matrix admin</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Matrix access" error={fieldErrors.matrixId}>
                <Select value={form.matrixId} onValueChange={setField("matrixId")}><SelectTrigger><SelectValue placeholder="Select a matrix" /></SelectTrigger>
                  <SelectContent>
                    {claimOptions.map((matrix) => (
                      <SelectItem key={matrix.id} value={matrix.id}>{matrix.id} — {matrix.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Expiration">
                <Select value={form.expiration} onValueChange={setField("expiration")}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem><SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem><SelectItem value="custom">Until matrix closed</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <div className="col-span-2">
                <Field label="Message (optional)">
                  <Textarea rows={3} placeholder="Add a note for the recipient…" value={form.message} onChange={(e) => setField("message")(e.target.value)} />
                </Field>
              </div>
            </form>

            <div className="rounded-lg border border-accent/50 bg-muted/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Invitation resolution</div>
                  <div className="mt-1 text-xs text-muted-foreground">System checks the recipient email before deciding whether to grant access or send registration.</div>
                </div>
                <StatusBadge variant="info">New users receive a secure code</StatusBadge>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
                {inviteResolutionSteps.map((step, index) => (
                  <div key={step.title} className="rounded-md border bg-background p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-accent">0{index + 1}</span>
                      <step.icon className="h-4 w-4 text-accent" />
                    </div>
                    <div className="mt-2 text-sm font-medium">{step.title}</div>
                    <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.body}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-md border bg-background p-3">
                  <div className="flex items-center justify-between"><div className="text-sm font-medium">Existing user found</div><StatusBadge variant="success">Grant access</StatusBadge></div>
                  <div className="mt-1 text-xs text-muted-foreground">Example: maria.chen@atlasmutual.com receives matrix access and notification immediately.</div>
                </div>
                <div className="rounded-md border bg-background p-3">
                  <div className="flex items-center justify-between"><div className="text-sm font-medium">New user required</div><StatusBadge variant="warning">Send invite</StatusBadge></div>
                  <div className="mt-1 text-xs text-muted-foreground">Example: lena.ortiz@harborlaw.com receives a secure code to accept at <span className="font-mono">/accept-invite</span>.</div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/40 p-4 text-xs text-muted-foreground">Temporary access codes are signed, audit-logged, and tied to the recipient email. New users accept at the secure /accept-invite page; existing users sign in via Claim Toolkit SSO.</div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="ghost" type="button" onClick={() => navigate("/dashboard")}><X className="h-4 w-4" /> Cancel</Button>
              <Button variant="outline" type="button" onClick={() => setForm(initialForm)}><Save className="h-4 w-4" /> Clear</Button>
              <Button type="button" onClick={handleSend} disabled={submitting || !canInvite}><Send className="h-4 w-4" /> {submitting ? "Sending…" : "Send invite"}</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-accent/50 xl:col-span-2">
          <CardContent className="p-0">
            <div className="px-5 py-4 border-b font-medium">Pending invitations</div>
            {loading ? (
              <div className="p-6"><Spinner /></div>
            ) : error ? (
              <div className="p-6 text-sm text-destructive">{error.message || "Failed to load invitations."}</div>
            ) : !invitations || invitations.length === 0 ? (
              <div className="p-6"><EmptyState title="No invitations yet" body="Sent invitations will appear here." /></div>
            ) : (
              <div className="divide-y">
                {invitations.map((p) => (
                  <div key={p.id} className="p-4 hover:bg-muted/40">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-md bg-info/15 text-info flex items-center justify-center"><Mail className="h-4 w-4" /></div>
                      <div className="flex-1 min-w-0">
                        <Link to={`/invitations/${p.id}`} className="font-medium truncate hover:text-accent">{p.email}</Link>
                        <div className="text-xs text-muted-foreground truncate">{p.company} · {p.role}</div>
                        <div className="text-xs font-mono text-muted-foreground mt-1">{p.matrixId}</div>
                        <div className="flex items-center gap-2 mt-2">
                          <StatusBadge variant={p.status === "Sent" ? "info" : "muted"}>{p.status}</StatusBadge>
                          <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><Clock className="h-3 w-3" /> expires {p.expires}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
