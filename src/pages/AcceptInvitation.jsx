import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, ShieldCheck, Users, FileSearch, GitBranch } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { lookupInvitation } from "@/services/authService";
import { ApiError, pickData } from "@/services/api";

function useFormField(initialValue = "") {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  return { value, setValue, error, setError, touched, setTouched };
}

function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

function validateFullName(fullName) {
  if (!fullName || !fullName.trim()) return "Full name is required";
  return "";
}

function validatePassword(password) {
  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  return "";
}

function validateConfirm(confirm, password) {
  if (!confirm) return "Please confirm your password";
  if (confirm !== password) return "Passwords do not match";
  return "";
}

export default function AcceptInvitation() {
  const navigate = useNavigate();
  const { acceptInvitation } = useAuth();

  // The invitation code arrives in the emailed link
  // (…/accept-invite?invitation-link=XXXXXX). Fall back to the legacy
  // ?invitation-code= / ?code= params so older links keep working.
  const [searchParams] = useSearchParams();
  const code =
    searchParams.get("invitation-link") ??
    searchParams.get("invitation-code") ??
    searchParams.get("code") ??
    "";

  const fullName = useFormField("");
  const password = useFormField("");
  const confirm = useFormField("");
  const [preview, setPreview] = useState(null);
  // Gates the submit button until the invitation lookup resolves. Starts true
  // when a code is present so the button is disabled during the initial fetch.
  const [lookupLoading, setLookupLoading] = useState(() => Boolean(code));
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Preview the invitation (invited email / company / role) for context.
  useEffect(() => {
    if (!code) {
      setLookupLoading(false);
      return;
    }
    let active = true;
    setLookupLoading(true);
    lookupInvitation(code)
      .then((res) => {
        if (active) setPreview(pickData(res));
      })
      .catch(() => {
        // A bad code surfaces on submit; the preview is best-effort only.
      })
      .finally(() => {
        if (active) setLookupLoading(false);
      });
    return () => {
      active = false;
    };
  }, [code]);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    const nameErr = validateFullName(fullName.value);
    const passErr = validatePassword(password.value);
    const confirmErr = validateConfirm(confirm.value, password.value);
    fullName.setError(nameErr);
    fullName.setTouched(true);
    password.setError(passErr);
    password.setTouched(true);
    confirm.setError(confirmErr);
    confirm.setTouched(true);
    if (nameErr || passErr || confirmErr) return;

    setSubmitting(true);
    try {
      // Establishes the session AND persists the returned bearer token, so the
      // dashboard's subsequent API calls are authenticated. Falls back to the
      // previewed invitation email if the response omits the user record.
      await acceptInvitation(
        { code: code.trim(), password: password.value, fullName: fullName.value.trim() },
        { email: preview?.email || "", name: fullName.value.trim() || preview?.email || "Invited user" }
      );
      toast.success("Your account has been created successfully.");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.fields?.password) {
        password.setError(err.fields.password);
      } else if (err instanceof ApiError && err.fields?.fullName) {
        fullName.setError(err.fields.fullName);
      } else {
        setFormError(err?.message || "We couldn't accept this invitation. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-sidebar text-sidebar-foreground overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)",
            backgroundSize: "32px 32px, 48px 48px",
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-md bg-accent text-accent-foreground flex items-center justify-center font-bold">CM</div>
            <div>
              <div className="text-xl font-semibold">Claim Matrix</div>
              <div className="text-xs uppercase tracking-wider text-sidebar-foreground/60">Shared Information. Better Results.</div>
            </div>
          </div>
        </div>

        <div className="relative space-y-8 max-w-lg">
          <div>
            <h1 className="text-3xl font-semibold leading-tight">You&apos;ve been invited to collaborate on a shared claim matrix.</h1>
            <p className="mt-3 text-sidebar-foreground/70 leading-relaxed">Set a password to activate your Claim Matrix account. Your access is scoped and fully audit-logged.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Users, label: "Multi-org matrixs" },
              { icon: FileSearch, label: "Evidence exchange" },
              { icon: GitBranch, label: "Negotiation flow" },
              { icon: ShieldCheck, label: "Immutable audit" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 rounded-lg bg-sidebar-accent/40 p-3 border border-sidebar-border">
                <div className="h-8 w-8 rounded-md bg-accent/20 text-accent flex items-center justify-center"><Icon className="h-4 w-4" /></div>
                <span className="text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-xs text-sidebar-foreground/60">Powered by <span className="text-sidebar-foreground">Claim Toolkit</span></div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex items-center gap-2">
            <div className="h-10 w-10 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold">CM</div>
            <div className="font-semibold">Claim Matrix</div>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">Set your password</h2>
          <p className="mt-2 text-sm text-muted-foreground">Create a password to finish setting up your account.</p>

          {preview && (
            <div className="mt-6 rounded-md border border-accent/40 bg-accent/10 p-3 text-sm">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <CheckCircle2 className="h-4 w-4 text-accent" /> Invitation verified
              </div>
              <dl className="mt-2 space-y-1 text-muted-foreground">
                {preview.email && <div className="flex justify-between gap-3"><dt>Email</dt><dd className="text-foreground">{preview.email}</dd></div>}
                {preview.company && <div className="flex justify-between gap-3"><dt>Company</dt><dd className="text-foreground">{preview.company}</dd></div>}
                {preview.role && <div className="flex justify-between gap-3"><dt>Role</dt><dd className="text-foreground">{preview.role}</dd></div>}
                {preview.matrixTitle && <div className="flex justify-between gap-3"><dt>Matrix</dt><dd className="text-foreground text-right">{preview.matrixTitle}</dd></div>}
              </dl>
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="invite-name">Full name</Label>
              <Input
                id="invite-name"
                type="text"
                placeholder="Jane Doe"
                autoComplete="name"
                autoFocus
                value={fullName.value}
                onChange={(e) => { fullName.setValue(e.target.value); if (fullName.touched) fullName.setError(validateFullName(e.target.value)); }}
                onBlur={() => { fullName.setTouched(true); fullName.setError(validateFullName(fullName.value)); }}
                className={fullName.touched && fullName.error ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              <FieldError message={fullName.touched ? fullName.error : ""} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invite-password">New password</Label>
              <Input
                id="invite-password"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                value={password.value}
                onChange={(e) => { password.setValue(e.target.value); if (password.touched) password.setError(validatePassword(e.target.value)); }}
                onBlur={() => { password.setTouched(true); password.setError(validatePassword(password.value)); }}
                className={password.touched && password.error ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              <FieldError message={password.touched ? password.error : ""} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invite-confirm">Confirm password</Label>
              <Input
                id="invite-confirm"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                value={confirm.value}
                onChange={(e) => { confirm.setValue(e.target.value); if (confirm.touched) confirm.setError(validateConfirm(e.target.value, password.value)); }}
                onBlur={() => { confirm.setTouched(true); confirm.setError(validateConfirm(confirm.value, password.value)); }}
                className={confirm.touched && confirm.error ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              <FieldError message={confirm.touched ? confirm.error : ""} />
            </div>

            {formError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{formError}</p>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={submitting || lookupLoading}>
              {submitting
                ? "Creating account…"
                : lookupLoading
                  ? "Verifying invitation…"
                  : "Create account & continue"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-center text-muted-foreground">
            I already have an account? <Link to="/signin" className="text-accent hover:underline font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
