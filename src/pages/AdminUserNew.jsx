import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import Stepper from "@/components/shared/Stepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCompanies } from "@/hooks/useCompanies";
import { createUser, saveDraftUser } from "@/services/userService";
import { ApiError } from "@/services/api";
import { ArrowLeft, Mail, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";

function Field({ label, children, error }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default function AdminUserNew() {
  const navigate = useNavigate();
  const { data: companies } = useCompanies();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("External Adjuster");
  const [scope, setScope] = useState("matrix");
  const [sendInvite, setSendInvite] = useState(true);
  const [requireMfa, setRequireMfa] = useState(true);
  const [autoExpire, setAutoExpire] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const buildPayload = () => ({
    fullName,
    email,
    jobTitle,
    phone,
    // The backend resolves company by NAME, not code — and "external" is a purely local
    // sentinel meaning "no Claim Toolkit company," which the backend expects as no value.
    company: company === "external" ? null : company || companies?.[0]?.name,
    role,
    accessScope: scope,
    sendInvite,
    requireMfa,
    autoExpire,
  });

  const submit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setSubmitting(true);
    try {
      await createUser(buildPayload());
      toast.success("Local user created. Invitation email queued.");
      navigate("/admin/users");
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        setFieldErrors(err.fields);
        toast.error(err.message || "Please fix the highlighted fields.");
      } else {
        toast.error(err.message || "Could not create the user.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const saveDraft = async () => {
    setFieldErrors({});
    setSavingDraft(true);
    try {
      await saveDraftUser(buildPayload());
      toast.success("User saved as draft.");
      navigate("/admin/users");
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        setFieldErrors(err.fields);
        toast.error(err.message || "Please fix the highlighted fields.");
      } else {
        toast.error(err.message || "Could not save the draft.");
      }
    } finally {
      setSavingDraft(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Add local Claim Matrix user"
        subtitle="Create a local profile for an external participant — separate from Claim Toolkit identities"
        actions={<Button asChild variant="outline" size="sm"><Link to="/admin/users"><ArrowLeft className="h-4 w-4" /> Back</Link></Button>}
      />

      <div className="mb-6"><Stepper steps={["Profile", "Company", "Access scope", "Review"]} current={1} /></div>

      <form onSubmit={submit} className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2 shadow-card border-accent/50">
          <CardContent className="p-6 space-y-6">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Profile</h3>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Full name" error={fieldErrors.fullName}>
                  <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Lena Ortiz" />
                </Field>
                <Field label="Work email" error={fieldErrors.email}>
                  <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@firm.com" />
                </Field>
                <Field label="Job title">
                  <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="External Adjuster" />
                </Field>
                <Field label="Phone (optional)">
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 415 555 0188" />
                </Field>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Company</h3>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Company" error={fieldErrors.company}>
                  <Select value={company || companies?.[0]?.name} onValueChange={setCompany}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(companies ?? []).map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                      <SelectItem value="external">External / Not in Claim Toolkit</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Role">
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Adjuster","Supervisor","Company Admin","External Adjuster","Viewer"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Access scope</h3>
              <RadioGroup value={scope} onValueChange={setScope} className="gap-2">
                {[
                  { v: "matrix", t: "Per-matrix", d: "Access only to claim matrixs they're explicitly invited to" },
                  { v: "company", t: "Company-wide", d: "Access to all shared matrixs for their organization" },
                  { v: "admin", t: "Workspace admin", d: "Full Claim Matrix admin (audit, user mgmt, org config)" },
                ].map((o) => (
                  <label key={o.v} className="flex items-start gap-3 rounded-md border bg-background p-3 text-sm cursor-pointer hover:bg-muted/40">
                    <RadioGroupItem value={o.v} className="mt-0.5" />
                    <div><div className="font-medium">{o.t}</div><div className="text-xs text-muted-foreground">{o.d}</div></div>
                  </label>
                ))}
              </RadioGroup>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Notification & security</h3>
              <label className="flex items-center gap-3 text-sm"><Checkbox checked={sendInvite} onCheckedChange={(v) => setSendInvite(!!v)} /> Send invitation email with one-time setup link</label>
              <label className="flex items-center gap-3 text-sm"><Checkbox checked={requireMfa} onCheckedChange={(v) => setRequireMfa(!!v)} /> Require MFA at first sign-in</label>
              <label className="flex items-center gap-3 text-sm"><Checkbox checked={autoExpire} onCheckedChange={(v) => setAutoExpire(!!v)} /> Auto-expire access after 90 days of inactivity</label>
            </section>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="shadow-card border-accent/50">
            <CardContent className="p-5 space-y-3 text-sm">
              <div className="flex items-center gap-2 font-medium"><ShieldCheck className="h-4 w-4 text-accent" /> Summary</div>
              <div className="text-muted-foreground">A local Claim Matrix profile is created. The user is <span className="font-medium text-foreground">not</span> provisioned in Claim Toolkit.</div>
              <StatusBadge variant="info">{`Local user · ${scope}`}</StatusBadge>
            </CardContent>
          </Card>
          <div className="flex flex-col gap-2">
            <Button type="submit" disabled={submitting || savingDraft}><UserPlus className="h-4 w-4" /> {submitting ? "Creating…" : "Create user & send invite"}</Button>
            <Button type="button" variant="outline" onClick={saveDraft} disabled={submitting || savingDraft}><Mail className="h-4 w-4" /> {savingDraft ? "Saving…" : "Save as draft"}</Button>
          </div>
        </div>
      </form>
    </>
  );
}
