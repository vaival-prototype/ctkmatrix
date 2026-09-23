import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import Spinner from "@/components/shared/Spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useClaimManagementCases } from "@/hooks/useClaimManagementCases";
import { useCompanies } from "@/hooks/useCompanies";
import { createClaimManagementCase } from "@/services/claimManagementService";
import { pickData } from "@/services/api";
import { CM5_AGREEMENT_TYPES } from "@/constants/claimManagement";
import { Handshake, Plus, Users } from "lucide-react";

function statusVariant(status) {
  if (status === "Settled") return "success";
  if (status === "Offered" || status === "Countered") return "info";
  if (status === "Evaluated") return "success";
  return "warning";
}

export default function ClaimManagement() {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, loading, error } = useClaimManagementCases(refreshKey);
  const { data: companiesData } = useCompanies();
  const companies = companiesData ?? [];
  const rows = data ?? [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [leadCompany, setLeadCompany] = useState("");
  const [agreementType, setAgreementType] = useState("JDA");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await createClaimManagementCase({ title, leadCompany, agreementType });
      const created = pickData(res);
      toast.success("Claim management case opened");
      setDialogOpen(false);
      setTitle("");
      setLeadCompany("");
      if (created?.id) navigate(`/claim-management/${created.id}`);
      else setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err.message || "Could not open the case");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Claim Management"
        subtitle="Contribution — coordinating negligent free third-party claims settled by JDA or SIA agreement"
        actions={<Button size="sm" variant="success" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> New case</Button>}
      />

      <Card className="shadow-card border-accent/50 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6"><Spinner /></div>
          ) : error || rows.length === 0 ? (
            <div className="p-6"><EmptyState title="No claim management cases" body={error ? error.message : "No negligent free third-party claims are being coordinated yet."} /></div>
          ) : (
            <div className="divide-y">
              {rows.map((c) => (
                <Link key={c.id} to={`/claim-management/${c.id}`} className="block p-5 hover:bg-muted/30">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 font-semibold"><Handshake className="h-4 w-4 text-accent" /> {c.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {c.leadCompany} · {c.agreementType} · <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {c.parties.length} {c.parties.length === 1 ? "party" : "parties"}</span>
                      </div>
                    </div>
                    <StatusBadge variant={statusVariant(c.status)}>{c.status}</StatusBadge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New claim management case</DialogTitle>
            <DialogDescription>Open a Contribution case to coordinate a negligent free third party's claim toward JDA/SIA settlement.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cm5-title">Case title</Label>
              <Input id="cm5-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. I-90 Westbound — Third Party Contribution" />
            </div>
            <div className="space-y-1.5">
              <Label>Lead company</Label>
              <Select value={leadCompany} onValueChange={setLeadCompany}>
                <SelectTrigger><SelectValue placeholder="Who is leading the agreement?" /></SelectTrigger>
                <SelectContent>
                  {companies.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Agreement type</Label>
              <Select value={agreementType} onValueChange={setAgreementType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CM5_AGREEMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t === "JDA" ? "Joint Defense Agreement (JDA)" : "Shared Interest Agreement (SIA)"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="success" disabled={creating || !title.trim()} onClick={handleCreate}>{creating ? "Opening…" : "Open case"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
