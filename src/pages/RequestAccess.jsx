import { useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, ClipboardCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createAccessRequest } from "@/services/accessService";
import { ApiError } from "@/services/api";
import Spinner from "@/components/shared/Spinner";
import { useInvitationLookup } from "@/hooks/useInvitationLookup";

function validateEmail(email) {
  if (!email.trim()) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address";
  return "";
}

/**
 * Level 1 sign-up. Reached two ways: from an invite email
 * (/request-access?invite=CODE — email locked to the invited address) or
 * self-service from the sign-in page. Either way the request waits in the
 * Approvals inbox; nobody gets an account until an Admin or Approver approves.
 */
export default function RequestAccess() {
  const [params] = useSearchParams();
  const inviteCode = params.get("invite");
  const { data: invite, loading: inviteLoading, error: inviteError } = useInvitationLookup(inviteCode);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!invite) return;
    setEmail(invite.email ?? "");
    setName((current) => current || invite.name || "");
    setCompany((current) => current || invite.company || "");
  }, [invite]);

  async function handleSubmit(e) {
    e.preventDefault();
    const nextErrors = {};
    if (!name.trim()) nextErrors.name = "Name is required";
    const emailErr = validateEmail(email);
    if (emailErr) nextErrors.email = emailErr;
    if (!company.trim()) nextErrors.company = "Company is required";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      await createAccessRequest({ name, email, company, reason, inviteCode: invite ? inviteCode : undefined });
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      toast.error(err?.message || "Unable to submit your request.");
    } finally {
      setSubmitting(false);
    }
  }

  if (inviteCode && inviteError?.code === "invitation_expired") return <Navigate to="/access-expired" replace />;
  if (inviteCode && inviteLoading) return <Spinner />;
  const inviteUnusable = !!inviteCode && (!!inviteError || (invite && (invite.inviteType !== "company-user" || invite.status !== "Sent")));

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6">
      <Card className="w-full max-w-lg border-border/60 shadow-elevated">
        <CardContent className="p-6">
          <Link to="/signin" className="mb-5 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/15 text-accent"><UserPlus className="h-5 w-5" /></div>
            <div>
              <h1 className="text-xl font-semibold">Request Claim Matrix access</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {invite && !inviteUnusable
                  ? `${invite.invitedBy} invited you to “${invite.matrixTitle}”. Tell us about your company — once approved you'll get an email to set your password.`
                  : "Tell us who you are. Your request is reviewed before any account is created."}
              </p>
            </div>
          </div>

          {inviteUnusable && !sent && (
            <div className="mb-4 rounded-md border border-warning/60 bg-warning/10 p-3 text-sm" role="alert">
              {inviteError?.message ||
                (invite?.status && invite.status !== "Sent"
                  ? "This invitation has already been used."
                  : "This invitation doesn't need an access request.")}{" "}
              You can still request access below without it.
            </div>
          )}

          {sent ? (
            <div className="rounded-md border border-accent/40 bg-accent/10 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground"><CheckCircle2 className="h-4 w-4 text-accent" /> Request submitted</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Your request for <span className="font-medium text-foreground">{company}</span> is waiting for approval. Once it's
                approved we'll email <span className="font-medium text-foreground">{email}</span> a link to set your password.
              </p>
              <Button asChild variant="outline" className="mt-4 w-full"><Link to="/signin">Back to sign in</Link></Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="ra-name">Full name</Label>
                <Input id="ra-name" value={name} onChange={(e) => setName(e.target.value)} className={errors.name ? "border-destructive" : ""} />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ra-email">Work email</Label>
                <Input
                  id="ra-email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  readOnly={!!invite && !inviteUnusable}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${errors.email ? "border-destructive" : ""} ${invite && !inviteUnusable ? "bg-muted/40" : ""}`}
                />
                {invite && !inviteUnusable && <p className="text-xs text-muted-foreground">Must match the email the invitation was sent to.</p>}
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ra-company">Company</Label>
                <Input id="ra-company" value={company} onChange={(e) => setCompany(e.target.value)} className={errors.company ? "border-destructive" : ""} />
                {errors.company && <p className="text-xs text-destructive">{errors.company}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ra-reason">Why do you need access? (optional)</Label>
                <Textarea id="ra-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. an adjuster referenced a claim I need to respond to" />
              </div>
              <p className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                <ClipboardCheck className="mr-1 inline h-3.5 w-3.5 text-accent" />
                New accounts start at Level 1: you can work on claims you're invited to. To start your own, request an
                upgrade after you sign in.
              </p>
              <Button type="submit" className="w-full" disabled={submitting}>{submitting ? "Submitting…" : "Submit request"}</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
