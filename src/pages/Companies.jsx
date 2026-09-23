import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import Spinner from "@/components/shared/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useRbacPolicy } from "@/hooks/useRbacPolicy";
import { getUserMemberships } from "@/services/userService";
import { pickData } from "@/services/api";
import { Building2, ArrowRightLeft, Sparkles } from "lucide-react";

export default function Companies() {
  const { user } = useAuth();
  const { data: rbacPolicy, loading: rbacLoading } = useRbacPolicy();
  const [memberships, setMemberships] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    getUserMemberships(user.id)
      .then((res) => {
        if (active) setMemberships(pickData(res) ?? []);
      })
      .catch((err) => {
        if (active) setError(err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  const roleKey = rbacPolicy?.roles.find((r) => r.name === user?.role)?.key ?? null;
  const myPermissions = roleKey
    ? (rbacPolicy?.matrix ?? []).map((f) => ({ function: f.function, value: f.roles[roleKey] ?? "no" }))
    : [];

  if (loading) return <Spinner />;

  return (
    <>
      <PageHeader
        title="Multi-Company Profile"
        subtitle={user ? `${user.name} · ${user.email}` : ""}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/companies/onboarding"><Building2 className="h-4 w-4" /> Onboarding</Link>
            </Button>
            <Button variant="outline" size="sm" disabled title="Switching active company context isn't available yet">
              <ArrowRightLeft className="h-4 w-4" /> Switch company <StatusBadge variant="warning"><Sparkles className="h-3 w-3" /> Coming soon</StatusBadge>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5">
        <Card className="shadow-card border-accent/50">
          <CardContent className="p-0">
            <div className="px-5 py-4 border-b font-medium">Company memberships</div>
            {error || !memberships || memberships.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="Data not found"
                  body={error?.message || "No company memberships are on record for your account yet."}
                />
              </div>
            ) : (
              <div className="divide-y">
                {memberships.map((m) => (
                  <div key={m.company} className="p-5 flex items-start gap-4">
                    <div className="h-10 w-10 rounded-md bg-primary/5 text-primary flex items-center justify-center">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold">{m.company}</div>
                        {m.isPrimary && <StatusBadge variant="success">Primary</StatusBadge>}
                      </div>
                      <div className="text-sm text-muted-foreground mt-0.5">{m.role || "No role assigned"}</div>
                    </div>
                    {!m.isPrimary && (
                      <Button variant="outline" size="sm" disabled title="Switching active company context isn't available yet">
                        Switch <StatusBadge variant="warning">Soon</StatusBadge>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card border-accent/50">
          <CardContent className="p-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Your role's permissions{user?.role ? ` (${user.role})` : ""}
            </div>
            {rbacLoading ? (
              <Spinner />
            ) : !roleKey ? (
              <EmptyState title="Data not found" body="No role is assigned to your account, so no permission policy applies yet." />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {myPermissions.map((p) => (
                  <div key={p.function} className="rounded-lg border bg-background p-3 flex items-center justify-between gap-2">
                    <span className="text-sm">{p.function}</span>
                    <StatusBadge variant={p.value === "yes" ? "success" : p.value === "maybe" ? "warning" : "muted"}>
                      {p.value === "yes" ? "Granted" : p.value === "maybe" ? "Conditional" : "Denied"}
                    </StatusBadge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
