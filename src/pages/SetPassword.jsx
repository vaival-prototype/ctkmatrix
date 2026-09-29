import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import Spinner from "@/components/shared/Spinner";
import { useAuth } from "@/context/AuthContext";
import { usePasswordToken } from "@/hooks/usePasswordToken";

function validate(password, confirm) {
  const errors = {};
  if (password.length < 8) errors.password = "Password must be at least 8 characters";
  if (confirm !== password) errors.confirm = "Passwords don't match";
  return errors;
}

/** Opened from the emailed set-password link: activates the account and signs in. */
export default function SetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const { completePasswordSetup } = useAuth();
  const { data: account, loading, error } = usePasswordToken(token);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const nextErrors = validate(password, confirm);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSubmitting(true);
    try {
      await completePasswordSetup({ token, password });
      toast.success(account?.purpose === "reset" ? "Password updated" : "Your account is ready");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setErrors({ form: err.message || "Couldn't set your password" });
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-card">
        <CardContent className="space-y-5 p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <KeyRound className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">
                {account?.purpose === "reset" ? "Choose a new password" : "Set your password"}
              </h1>
              <p className="text-sm text-muted-foreground">Claim Matrix</p>
            </div>
          </div>

          {loading ? (
            <Spinner />
          ) : !token || error ? (
            <div className="space-y-4" role="alert">
              <p className="text-sm text-muted-foreground">
                {error?.message || "This link is missing its token."} Ask for a new link or sign in if you already have
                a password.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/password-reset">Send a new link</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/signin">Sign in</Link>
                </Button>
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <div className="font-medium">{account?.name}</div>
                <div className="text-muted-foreground">{account?.email}</div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password">Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "new-password-error" : undefined}
                />
                {errors.password && (
                  <p id="new-password-error" className="text-xs text-destructive">
                    {errors.password}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  aria-invalid={!!errors.confirm}
                  aria-describedby={errors.confirm ? "confirm-password-error" : undefined}
                />
                {errors.confirm && (
                  <p id="confirm-password-error" className="text-xs text-destructive">
                    {errors.confirm}
                  </p>
                )}
              </div>
              {errors.form && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                  {errors.form}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Saving…" : "Save password and continue"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
