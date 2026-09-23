import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";

export default function Settings() {
  return (
    <>
      <PageHeader title="Settings" subtitle="Workspace, security and integration preferences" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[
          { t: "Workspace", d: "Display name, default organization, regional settings", to: "/settings/workspace" },
          { t: "Security & SSO", d: "Claim Toolkit SSO, matrix policy, IP allowlist", to: "/settings/security" },
          { t: "Notifications", d: "Email & in-app delivery preferences per event type", to: "/settings/notifications" },
          { t: "Integrations", d: "Claim Toolkit sync, document storage, exports" },
          { t: "Workflow Confirmations", d: "Success, empty and confirmation states for claim collaboration flows", to: "/prototype-states" },
        ].map((s) => (
          <Card key={s.t} className="shadow-card border-accent/50">
            <CardContent className="p-6">
              <div className="font-semibold">{s.t}</div>
              <div className="text-sm text-muted-foreground mt-1">{s.d}</div>
              {s.to && <Link to={s.to} className="mt-4 inline-flex text-sm font-medium text-accent">Open settings</Link>}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
