import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck, Users, FileSearch, GitBranch } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/services/api";
import { demoAccounts } from "@/data/mock";

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

function validateEmail(email) {
  if (!email.trim()) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address";
  return "";
}

function validatePassword(password) {
  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  return "";
}

export default function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const email = useFormField("");
  const password = useFormField("");
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const redirectTo = location.state?.from ?? "/dashboard";

  async function handleSignIn(e) {
    e.preventDefault();
    setFormError("");
    const emailErr = validateEmail(email.value);
    const passErr = validatePassword(password.value);
    email.setError(emailErr);
    email.setTouched(true);
    password.setError(passErr);
    password.setTouched(true);
    if (emailErr || passErr) return;

    setSubmitting(true);
    try {
      await login({ email: email.value, password: password.value, remember });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        if (err.fields.email) email.setError(err.fields.email);
        if (err.fields.password) password.setError(err.fields.password);
      }
      setFormError(err?.message || "Unable to sign in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleBlur(field, validator) {
    field.setTouched(true);
    field.setError(validator(field.value));
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
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-md bg-accent text-accent-foreground flex items-center justify-center font-bold">CM</div>
            <div>
              <div className="text-xl font-semibold">Claim Matrix</div>
              <div className="text-xs uppercase tracking-wider text-sidebar-foreground/60">Shared Information. Better Results.</div>
            </div>
          </Link>
        </div>

        <div className="relative space-y-8 max-w-lg">
          <div>
            <h1 className="text-3xl font-semibold leading-tight">Collaborate on shared claim matrixs across companies — securely and on the record.</h1>
            <p className="mt-3 text-sidebar-foreground/70 leading-relaxed">Claim Matrix extends Claim Toolkit with structured negotiation, evidence sharing, and full audit traceability between insurers, adjusters and external participants.</p>
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
          <Link to="/dashboard" className="lg:hidden mb-8 flex items-center gap-2">
            <div className="h-10 w-10 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold">CM</div>
            <div className="font-semibold">Claim Matrix</div>
          </Link>

          <h2 className="text-2xl font-semibold tracking-tight">Sign in to your workspace</h2>
          <p className="mt-2 text-sm text-muted-foreground">Use your Claim Toolkit credentials to access shared claim matrixs.</p>

          <form className="mt-8 space-y-4" onSubmit={handleSignIn} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="signin-email">Work email</Label>
              <Input
                id="signin-email"
                type="email"
                placeholder="john.smith@northbridge.com"
                value={email.value}
                onChange={(e) => { email.setValue(e.target.value); if (email.touched) email.setError(validateEmail(e.target.value)); }}
                onBlur={() => handleBlur(email, validateEmail)}
                className={email.touched && email.error ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              <FieldError message={email.touched ? email.error : ""} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="signin-password">Password</Label>
                <Link to="/password-reset" className="text-xs text-accent hover:underline">Forgot password?</Link>
              </div>
              <Input
                id="signin-password"
                type="password"
                placeholder="••••••••"
                value={password.value}
                onChange={(e) => { password.setValue(e.target.value); if (password.touched) password.setError(validatePassword(e.target.value)); }}
                onBlur={() => handleBlur(password, validatePassword)}
                className={password.touched && password.error ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              <FieldError message={password.touched ? password.error : ""} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="remember" checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
              <Label htmlFor="remember" className="text-sm font-normal">Remember this device for 30 days</Label>
            </div>
            {formError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{formError}</p>
            )}
            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 rounded-md border bg-muted/30 p-4">
            <div className="text-xs font-semibold text-foreground">Demo accounts (prototype only)</div>
            <div className="mt-2 grid grid-cols-1 gap-1.5">
              {demoAccounts.map((acct) => (
                <button
                  key={acct.email}
                  type="button"
                  className="rounded-sm border bg-background px-2.5 py-1.5 text-left text-xs text-muted-foreground hover:border-accent hover:text-foreground"
                  onClick={() => { email.setValue(acct.email); password.setValue("demo1234"); }}
                >
                  {acct.label}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-6 text-xs text-center text-muted-foreground">
            No invitation? <Link to="/request-access" className="text-accent hover:underline">Request access</Link>
          </p>
          <p className="mt-2 text-xs text-center text-muted-foreground">Powered by <span className="font-medium text-foreground">Claim Toolkit</span></p>
        </div>
      </div>
    </div>
  );
}
