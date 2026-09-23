import { useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import Spinner from "@/components/shared/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompanies } from "@/hooks/useCompanies";
import { toast } from "sonner";
import { Building2, CheckCircle2, RefreshCcw, ShieldCheck, SlidersHorizontal, Sparkles, UserPlus, UsersRound } from "lucide-react";

function Metric({ label, value }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function companySubscriptions(subscription) {
  if (subscription === "Enterprise") {
    return ["Claim Matrix", "Auto Liability", "Audit", "Compliance", "Total Loss Tax & Fees"];
  }
  if (subscription === "Partner") {
    return ["Claim Matrix", "Auto Liability"];
  }
  if (subscription === "External only") {
    return ["External Claim Matrix"];
  }
  return ["Not configured"];
}

export default function AdminCompanyEnablement() {
  const { data: companies, loading, error } = useCompanies();
  const [createMode, setCreateMode] = useState("activated");

  if (loading) return <Spinner />;
  if (error) {
    return <EmptyState title="Data not found" body={error.message || "Companies could not be loaded."} />;
  }
  if (!companies || companies.length === 0) {
    return <EmptyState title="Data not found" body="No Claim Toolkit companies are available to enable yet." />;
  }

  // The current API has no company-enable endpoint; surface that clearly
  // instead of calling a route that doesn't exist.
  const handleEnable = (company) => {
    toast.info(`Enabling ${company.name} isn't available in the current API yet.`);
  };

  return (
    <>
      <PageHeader
        title="Company Enablement"
        subtitle="Activate Claim Matrix configuration records for Claim Toolkit companies — including the Holding Queue, where a matrix recipient that's a brand-new company lands automatically for review"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="outline"><Link to="/admin/access-requests"><UserPlus className="h-4 w-4" /> Access requests</Link></Button>
            <Button asChild size="sm"><Link to="/companies/onboarding"><CheckCircle2 className="h-4 w-4" /> Enable selected company</Link></Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2 shadow-card border-accent/50">
          <CardContent className="p-0">
            <div className="divide-y">
              {companies.map((company) => (
                <div key={company.id} className="flex items-start gap-4 p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/5 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold">{company.name}</div>
                      <StatusBadge variant={company.status === "Enabled" ? "success" : company.status === "Holding Queue" ? "info" : company.status === "Pending activation" ? "warning" : "danger"}>
                        {company.status}
                      </StatusBadge>
                      <StatusBadge variant={company.trust === "Approved" ? "success" : "warning"}>{company.trust}</StatusBadge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">Claim Toolkit company_id: {company.id}</div>
                    {company.holdingReason && (
                      <div className="mt-1 text-xs italic text-muted-foreground">{company.holdingReason}</div>
                    )}
                    <div className="mt-3 grid grid-cols-4 gap-3 text-sm">
                      <Metric label="Contacts" value={company.contacts} />
                      <Metric label="Matrixs" value={company.matrixs} />
                      <Metric label="Notifications" value={company.notifications} />
                      <Metric label="Subscription" value={company.subscription} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {companySubscriptions(company.subscription).map((subscription) => (
                        <StatusBadge key={subscription} variant={subscription === "Not configured" ? "warning" : subscription === "External only" ? "muted" : "info"}>
                          {subscription}
                        </StatusBadge>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleEnable(company)}
                      disabled={company.status === "Enabled"}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {company.status === "Enabled" ? "Enabled" : "Enable"}
                    </Button>
                    <Button asChild variant="outline" size="sm"><Link to={`/companies/onboarding?company=${encodeURIComponent(company.id)}`}><SlidersHorizontal className="h-4 w-4" /> Configure</Link></Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-accent/50 h-fit">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 font-medium">
              <UsersRound className="h-4 w-4 text-accent" /> Admin tools
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Button asChild variant="outline" className="justify-start">
                <Link to="/admin/users"><UsersRound className="h-4 w-4" /> User Management</Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link to="/admin/users/sync"><RefreshCcw className="h-4 w-4" /> Sync Claim Toolkit Users</Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link to="/admin/users/new"><UserPlus className="h-4 w-4" /> Add Local User</Link>
              </Button>
            </div>

            <div className="border-t pt-4" />

            <div className="flex items-center gap-2 font-medium">
              <ShieldCheck className="h-4 w-4 text-accent" /> Activation checklist
            </div>
            {["Agreement accepted", "Eligibility verified", "Trust score approved", "Billing configured", "Notification contacts set"].map((item, index) => (
              <div key={item} className="flex items-center justify-between text-sm">
                <span>{item}</span>
                <StatusBadge variant={index < 3 ? "success" : "warning"}>{index < 3 ? "Done" : "Pending"}</StatusBadge>
              </div>
            ))}
            <Select value={createMode} onValueChange={setCreateMode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="activated">Only create when activated</SelectItem>
                <SelectItem value="all">Create for all Claim Toolkit companies</SelectItem>
              </SelectContent>
            </Select>
            <Button className="w-full" disabled title="Saving this configuration isn't available in the current API yet">
              Save configuration <StatusBadge variant="warning"><Sparkles className="h-3 w-3" /> Coming soon</StatusBadge>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
