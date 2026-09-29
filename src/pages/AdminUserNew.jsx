import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Mail, ShieldCheck, UserPlus } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompanies } from "@/hooks/useCompanies";
import { createUser } from "@/services/userService";
import { ApiError } from "@/services/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ACCOUNT_TYPES = [
  {
    value: "approver",
    title: "Approver",
    body: "Works the Approvals inbox (access and upgrade requests) and can view every claim and the Audit Trail, read-only.",
  },
  {
    value: "level1",
    title: "Level 1 user",
    body: "Not a Claim Toolkit customer. Works on claims they're invited to; can request an upgrade later.",
  },
];

function Field({ id, label, error, children }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Admin only: add a local Claim Matrix account (Approver or Level 1). */
export default function AdminUserNew() {
  const navigate = useNavigate();
  const { data: companies } = useCompanies();

  const [accountType, setAccountType] = useState("approver");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [sendInvite, setSendInvite] = useState(true);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const next = {};
    if (!fullName.trim()) next.fullName = "Full name is required";
    if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email address";
    if (accountType === "level1" && !company) next.company = "Choose their company";
    return next;
  }

  async function submit(e) {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;
    setSubmitting(true);
    try {
      await createUser({ accountType, fullName: fullName.trim(), email: email.trim(), jobTitle, phone, company, sendInvite });
      toast.success(sendInvite ? `${fullName.trim()} added — set-password email sent` : `${fullName.trim()} added`);
      navigate("/admin/users");
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      toast.error(err.message || "Couldn't add the user");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Add local Claim Matrix user"
        subtitle="Accounts that exist only in Claim Matrix — separate from Claim Toolkit sign-ins"
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/users">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
        }
      />

      <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="shadow-card border-accent/50 xl:col-span-2">
          <CardContent className="space-y-6 p-6">
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Account type</h2>
              <RadioGroup value={accountType} onValueChange={setAccountType} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {ACCOUNT_TYPES.map((t) => (
                  <label
                    key={t.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-md border p-4 ${accountType === t.value ? "border-accent bg-accent/5" : "hover:border-accent/50"}`}
                  >
                    <RadioGroupItem value={t.value} className="mt-1" />
                    <div>
                      <div className="font-semibold">{t.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{t.body}</div>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Profile</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field id="nu-name" label="Full name" error={errors.fullName}>
                  <Input id="nu-name" value={fullName} onChange={(e) => setFullName(e.target.value)} aria-invalid={!!errors.fullName} />
                </Field>
                <Field id="nu-email" label="Work email" error={errors.email}>
                  <Input id="nu-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} />
                </Field>
                <Field id="nu-title" label="Job title (optional)">
                  <Input id="nu-title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
                </Field>
                <Field id="nu-phone" label="Phone (optional)">
                  <Input id="nu-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </Field>
                {accountType === "level1" && (
                  <Field id="nu-company" label="Company" error={errors.company}>
                    <Select value={company} onValueChange={setCompany}>
                      <SelectTrigger id="nu-company" aria-invalid={!!errors.company}>
                        <SelectValue placeholder="Choose a company" />
                      </SelectTrigger>
                      <SelectContent>
                        {(companies ?? []).map((c) => (
                          <SelectItem key={c.id} value={c.name}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </div>
            </section>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={sendInvite} onCheckedChange={(v) => setSendInvite(!!v)} />
              Email them a link to set their password
            </label>

            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>
                <UserPlus className="h-4 w-4" /> {submitting ? "Adding…" : "Add user"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit shadow-card border-accent/50">
          <CardContent className="space-y-3 p-5 text-sm">
            <div className="font-medium">What happens next</div>
            <div className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              They get an email with a link to set a password (see the Demo inbox).
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              They sign in on the Matrix sign-in page. Only the Admin can add local users.
            </div>
          </CardContent>
        </Card>
      </form>
    </>
  );
}
