import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prototypeStates } from "@/data/mock";
import { CheckCircle2, Inbox } from "lucide-react";

export default function PrototypeStates() {
  return (
    <>
      <PageHeader
        title="Workflow Confirmations"
        subtitle="Success, empty, and confirmation states used across collaboration workflows"
        actions={<Button asChild variant="outline" size="sm"><Link to="/demo">Demo map</Link></Button>}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card className="shadow-card border-accent/50">
          <CardContent className="p-5 space-y-3">
            <div className="font-medium">Success confirmations</div>
            {prototypeStates.map((state) => (
              <Link key={state.title} to={state.next} className="flex gap-3 rounded-md border p-3 hover:bg-muted/40">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-accent" />
                <div><div className="text-sm font-medium">{state.title}</div><div className="text-xs text-muted-foreground">{state.body}</div></div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-card border-accent/50">
          <CardContent className="p-5 space-y-4">
            <div className="font-medium">Empty states</div>
            <EmptyState
              title="No pending invitations"
              body="Once all recipients accept or expire, this queue stays quiet."
              action={<StatusBadge variant="success">All clear</StatusBadge>}
            />
            <EmptyState
              title="No Matrixes match this filter"
              body="Try clearing filters or switching organization context."
              action={<Button asChild variant="outline" size="sm"><Link to="/claims"><Inbox className="h-4 w-4" /> Clear filters</Link></Button>}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
