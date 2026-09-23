import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/services/authService";
import { ApiError } from "@/services/api";

function validateEmail(email) {
  if (!email.trim()) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address";
  return "";
}

export default function PasswordReset() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const emailErr = validateEmail(email);
    setError(emailErr);
    if (emailErr) return;

    setSubmitting(true);
    try {
      await requestPasswordReset({ email });
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError && err.fields?.email) setError(err.fields.email);
      toast.error(err?.message || "Unable to send reset instructions.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <Card className="w-full max-w-md border-border/60 shadow-elevated">
        <CardContent className="p-6">
          <Link to="/" className="mb-5 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/15 text-accent">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Reset access</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Claim Toolkit SSO users are redirected to the Claim Toolkit credential flow. Local Claim Matrix users receive a secure reset email.
              </p>
            </div>
          </div>

          {sent ? (
            <div className="rounded-md border border-accent/40 bg-accent/10 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CheckCircle2 className="h-4 w-4 text-accent" /> Check your inbox
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                If an account exists for <span className="font-medium text-foreground">{email}</span>, reset instructions are on their way.
              </p>
              <Button asChild variant="outline" className="mt-4 w-full">
                <Link to="/signin">Back to sign in</Link>
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="reset-email">Work email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (error) setError(validateEmail(e.target.value)); }}
                  className={error ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                <Mail className="h-4 w-4" /> {submitting ? "Sending…" : "Send reset instructions"}
              </Button>
              <Button asChild variant="outline" className="w-full" type="button">
                <Link to="/dashboard">Continue with Claim Toolkit SSO</Link>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
