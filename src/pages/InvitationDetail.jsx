import { Link, useParams } from "react-router-dom";
import DetailRow from "@/components/shared/DetailRow";
import Spinner from "@/components/shared/Spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useInvitations } from "@/hooks/useInvitations";
import { CheckCircle2, Clock, FileText, ShieldCheck } from "lucide-react";

export default function InvitationDetail() {
  const { inviteId } = useParams();
  const { data: invitations, loading } = useInvitations();

  if (loading || !invitations) return <Spinner />;

  const invite = invitations.find((item) => item.id === inviteId) ?? invitations[0];

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <Link to="/dashboard" className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold">CM</div>
          <div><div className="font-semibold">Claim Matrix</div><div className="text-xs text-muted-foreground">Secure shared claim access</div></div>
        </Link>

        <Card className="shadow-card border-accent/50">
          <CardContent className="p-8">
            <div className="mb-6 flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-accent/15 text-accent"><ShieldCheck className="h-6 w-6" /></div>
              <div>
                <h1 className="text-2xl font-semibold">You have been invited to a Matrix</h1>
                <p className="mt-2 text-sm text-muted-foreground">Review the claim package, respond with structured comments, and upload supporting material.</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-lg border bg-background p-4">
                <DetailRow label="Matrix" value={invite.matrixId} />
                <DetailRow label="Claim" value={invite.matrixTitle} />
                <DetailRow label="Company" value={invite.company} />
                <DetailRow label="Role" value={invite.role} />
                <DetailRow label="Expires" value={invite.expires} />
              </div>
              <div className="rounded-lg border bg-background p-4">
                <div className="mb-3 text-sm font-medium">Scoped access included</div>
                <div className="space-y-3">
                  {invite.permissions.map((permission) => (
                    <div key={permission} className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-accent" />{permission}</div>
                  ))}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="h-4 w-4" />Temporary access is audit-logged.</div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild><Link to="/accept-invite">Accept invitation</Link></Button>
              <Button asChild variant="outline"><Link to={`/claims/${invite.matrixId}`}><FileText className="h-4 w-4" /> Preview matrix</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
