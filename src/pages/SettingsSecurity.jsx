import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import Spinner from "@/components/shared/Spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRbacPolicy } from "@/hooks/useRbacPolicy";
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";

function ComingSoonCard({ title, description }) {
  return (
    <Card className="shadow-card border-accent/50">
      <CardContent className="p-5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="font-medium">{title}</div>
          <StatusBadge variant="warning"><Sparkles className="h-3 w-3" /> Coming soon</StatusBadge>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function SettingsSecurity() {
  const { data: rbacPolicy, loading } = useRbacPolicy();
  const roles = rbacPolicy?.roles ?? [];
  const functionCount = rbacPolicy?.matrix?.length ?? 0;

  return (
    <>
      <PageHeader
        title="Security & SSO"
        subtitle="Matrix access policy, single sign-on, and network restrictions"
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/settings"><ArrowLeft className="h-4 w-4" /> Back to settings</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2 shadow-card border-accent/50">
          <CardHeader><CardTitle className="text-base">Matrix access policy (RBAC)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <Spinner />
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <StatusBadge variant="success"><ShieldCheck className="h-3 w-3" /> RBAC enabled</StatusBadge>
                  <span className="text-sm text-muted-foreground">
                    {roles.length} role{roles.length === 1 ? "" : "s"} · {functionCount} function{functionCount === 1 ? "" : "s"} governed
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => (
                    <span key={role.key} className="rounded-md border bg-muted/40 px-2.5 py-1 text-xs font-medium">{role.name}</span>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Every claim matrix action is gated by role — who can view, comment, negotiate, or
                  administer is controlled from one policy matrix shared across the workspace.
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin/users">Manage roles &amp; permissions</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <ComingSoonCard
            title="Claim Toolkit SSO"
            description="Single sign-on against the shared Claim Toolkit identity provider isn't wired up yet — sign-in currently uses Claim Matrix's own session."
          />
          <ComingSoonCard
            title="IP allowlist"
            description="Restricting workspace access to specific IP ranges isn't available yet."
          />
        </div>
      </div>
    </>
  );
}
