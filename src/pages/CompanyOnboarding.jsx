import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getCompanyDetail, submitCompanyOnboarding } from "@/services/companyService";
import { pickData } from "@/services/api";
import { toast } from "sonner";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import Stepper from "@/components/shared/Stepper";
import Spinner from "@/components/shared/Spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Bell, Car, CheckCircle2, ClipboardCheck, FileSignature, History,
  KeyRound, Plus, RotateCcw, Save, ShieldCheck, SlidersHorizontal,
  Scale, ScrollText, UserPlus,
} from "lucide-react";

function Field({ label, children }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}

function ConfigPanel({ icon: Icon, title, children }) {
  return (
    <div className="rounded-md border bg-background p-4 space-y-3">
      <div className="flex items-center gap-2 font-medium"><Icon className="h-4 w-4 text-accent" />{title}</div>
      {children}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border bg-muted/25 px-3 py-2 text-sm">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        <StatusBadge variant={checked ? "success" : "muted"}>{checked ? "On" : "Off"}</StatusBadge>
        <Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} />
      </div>
    </label>
  );
}

function LifecycleButton({ label, active, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-md border px-3 py-2 text-xs font-medium ${active ? "border-accent bg-accent text-accent-foreground" : "bg-card hover:border-accent"}`}>
      {label}
    </button>
  );
}

function ModuleFact({ label, value }) {
  return <div className="rounded-md border bg-background p-2"><div className="text-[11px] text-muted-foreground">{label}</div><div className="font-semibold">{value}</div></div>;
}

function lifecycleStatusLabel(value) {
  return { pending: "Pending activation", active: "Active", deactivated: "Deactivated", reactivation: "Reactivation review" }[value] ?? value;
}
function trustStatusLabel(value) {
  return { approved: "Approved", review: "Review required", conditional: "Conditional approval", denied: "Denied" }[value] ?? value;
}
function billingPlanLabel(value) {
  return { pending: "Pending setup", partner: "Partner", enterprise: "Enterprise" }[value] ?? value;
}

const productModules = [
  { name: "Claim Matrix", description: "Shared claim matrixs, collaboration, documents, settlement, notifications, and audit.", initialLifecycle: "active", basePrice: "$1,250 / month", usagePrice: "$3 / shared matrix", icon: ClipboardCheck, features: ["Matrixes", "External participant access", "Structured settlement outcomes", "Matrix audit trail"] },
  { name: "Claim Toolkit Auto Liability", description: "Auto liability assessment and package handoff source for Claim Matrix.", initialLifecycle: "active", basePrice: "$2,500 / month", usagePrice: "$8 / assessment", icon: Car, features: ["Liability assessment", "Claim Toolkit Auto claim reference", "Send package to Claim Matrix", "Operational claim ownership"] },
  { name: "Claim Toolkit Audit", description: "Audit review workflows, retained activity, visibility, and exportable records.", initialLifecycle: "pending", basePrice: "$1,800 / month", usagePrice: "$5 / audit file", icon: History, features: ["Audit queue", "Activity visibility", "Exportable review records", "Retention configuration"] },
  { name: "Claim Toolkit Compliance", description: "Compliance workflows, legal/regulatory review support, and jurisdiction guidance.", initialLifecycle: "pending", basePrice: "$1,200 / month", usagePrice: "$2 / compliance review", icon: ScrollText, features: ["Compliance checklist", "Jurisdiction references", "Review evidence support", "Regulatory visibility"] },
  { name: "Total Loss Tax & Fees", description: "Total loss tax, title, registration, fee, and valuation support.", initialLifecycle: "pending", basePrice: "$1,500 / month", usagePrice: "$4 / valuation", icon: Scale, features: ["Tax and fee lookup", "Title/registration calculations", "Total loss support", "Valuation packet inputs"] },
];

function ProductModuleCard({ product, lifecycleStatus, setLifecycleStatus }) {
  const Icon = product.icon;
  return (
    <div className="rounded-md border border-accent/35 bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-accent text-accent-foreground"><Icon className="h-6 w-6" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div><div className="font-semibold">{product.name}</div><div className="mt-0.5 text-xs text-muted-foreground">{product.description}</div></div>
            <StatusBadge variant={lifecycleStatus === "active" ? "success" : lifecycleStatus === "deactivated" ? "danger" : lifecycleStatus === "reactivation" ? "info" : "warning"}>{lifecycleStatusLabel(lifecycleStatus)}</StatusBadge>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm"><ModuleFact label="Base" value={product.basePrice} /><ModuleFact label="Usage" value={product.usagePrice} /></div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {product.features.map((f) => <div key={f} className="flex items-start gap-2 text-xs text-muted-foreground"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" /><span>{f}</span></div>)}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
            <LifecycleButton label="Activate" active={lifecycleStatus === "active"} onClick={() => setLifecycleStatus(lifecycleStatus === "active" ? "pending" : "active")} />
            <LifecycleButton label="Deactivate" active={lifecycleStatus === "deactivated"} onClick={() => setLifecycleStatus(lifecycleStatus === "deactivated" ? "pending" : "deactivated")} />
            <LifecycleButton label="Reactivate" active={lifecycleStatus === "reactivation"} onClick={() => setLifecycleStatus(lifecycleStatus === "reactivation" ? "pending" : "reactivation")} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductEnablementSection({ subscriptionOwner, setSubscriptionOwner, productStatuses, setProductLifecycle }) {
  return (
    <div className="rounded-md border bg-background p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-medium"><SlidersHorizontal className="h-4 w-4 text-accent" /> Claim Toolkit products & Claim Matrix enablement</div>
          <p className="mt-1 text-xs text-muted-foreground">Demo pricing is illustrative until Claim Toolkit account pricing is confirmed.</p>
        </div>
        <div className="min-w-[280px]"><Field label="Subscription owner"><Input value={subscriptionOwner} placeholder="Claim Toolkit account billing" onChange={(e) => setSubscriptionOwner(e.target.value)} /></Field></div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {productModules.map((product) => (
          <ProductModuleCard key={product.name} product={product} lifecycleStatus={productStatuses[product.name] ?? "pending"} setLifecycleStatus={(value) => setProductLifecycle(product.name, value)} />
        ))}
      </div>
    </div>
  );
}

const blankChecks = () => [
  { label: "Agreement accepted by company admin", checked: false },
  { label: "Eligibility checked against Claim Toolkit records", checked: false },
  { label: "Customer service trust review completed", checked: false },
  { label: "Notification contacts verified", checked: false },
];

const defaultProductStatuses = () => Object.fromEntries(productModules.map((p) => [p.name, "pending"]));

export default function CompanyOnboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editCode = searchParams.get("company");
  const isEditMode = Boolean(editCode);

  const [loadingDetail, setLoadingDetail] = useState(isEditMode);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [companyId, setCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [activationMode, setActivationMode] = useState("limited");
  const [lifecycleStatus, setLifecycleStatus] = useState("pending");
  const [collaborationAccess, setCollaborationAccess] = useState("two-party");
  const [agreementStatus, setAgreementStatus] = useState("not-sent");
  const [eligibilityStatus, setEligibilityStatus] = useState("new-ctk");
  const [trustStatus, setTrustStatus] = useState("review");
  const [trustScore, setTrustScore] = useState("");
  const [billingPlan, setBillingPlan] = useState("pending");
  const [subscriptionOwner, setSubscriptionOwner] = useState("");
  const [auditVisibility, setAuditVisibility] = useState("company-admins");
  const [matrixRetention, setMatrixRetention] = useState("7-years");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [inAppNotifications, setInAppNotifications] = useState(true);
  const [settlementNotifications, setSettlementNotifications] = useState(true);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [externalInvites, setExternalInvites] = useState("approval");
  const [structuredSettlement, setStructuredSettlement] = useState(true);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [domain, setDomain] = useState("");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [productStatuses, setProductStatuses] = useState(defaultProductStatuses);
  const [contacts, setContacts] = useState([]);
  const [checks, setChecks] = useState(blankChecks);

  useEffect(() => {
    if (!isEditMode) return;
    let active = true;
    setLoadingDetail(true);
    setNotFound(false);
    getCompanyDetail(editCode)
      .then((res) => {
        if (!active) return;
        const detail = pickData(res);
        if (!detail) {
          setNotFound(true);
          return;
        }
        setCompanyId(detail.companyId ?? editCode);
        setCompanyName(detail.companyName ?? "");
        setActivationMode(detail.activationMode ?? "limited");
        setLifecycleStatus(detail.lifecycleStatus ?? "pending");
        setCollaborationAccess(detail.collaborationAccess ?? "two-party");
        setAgreementStatus(detail.agreementStatus ?? "not-sent");
        setEligibilityStatus(detail.eligibilityCheck ?? "matched");
        setTrustStatus(detail.trustApproval ?? "review");
        setTrustScore(detail.trustScore != null ? String(detail.trustScore) : "");
        setBillingPlan(detail.billingPlan ?? "pending");
        setSubscriptionOwner(detail.subscriptionOwner ?? "");
        setAuditVisibility(detail.auditVisibility ?? "company-admins");
        setMatrixRetention(detail.matrixRetention ?? "7-years");
        setExternalInvites(detail.externalInvitePolicy ?? "approval");
        setAdminName(detail.companyAdmin ?? "");
        setAdminEmail(detail.adminEmail ?? "");
        setSupportEmail(detail.notificationEmail ?? "");
        setDomain(detail.allowedDomain ?? "");
        setNotes(detail.notes ?? "");
        const toggles = detail.toggles ?? {};
        setEmailNotifications(toggles.emailNotifications ?? true);
        setInAppNotifications(toggles.inAppNotifications ?? true);
        setSettlementNotifications(toggles.settlementNotifications ?? true);
        setAutoSyncEnabled(toggles.autoSyncEnabled ?? true);
        setStructuredSettlement(toggles.structuredSettlement ?? true);
        setContacts((detail.contacts ?? []).map((c) => ({ name: c.name ?? "", email: c.email ?? "", role: c.role ?? "Adjuster" })));
        setProductStatuses({ ...defaultProductStatuses(), ...(detail.productStatuses ?? {}) });
        // Already-onboarded companies don't need to re-clear the checklist to save an edit.
        setChecks(blankChecks().map((c) => ({ ...c, checked: true })));
      })
      .catch(() => {
        if (active) setNotFound(true);
      })
      .finally(() => {
        if (active) setLoadingDetail(false);
      });
    return () => {
      active = false;
    };
  }, [editCode, isEditMode]);

  const completedChecks = checks.filter((item) => item.checked).length;
  const activationReady = completedChecks === checks.length && adminEmail.length > 0 && supportEmail.length > 0;
  const currentStep = activationReady ? 4 : completedChecks >= 3 ? 3 : 2;

  const summary = useMemo(() => [
    { label: "Company", value: companyName || "—" },
    { label: "Claim Toolkit company_id", value: companyId || "—" },
    { label: "Primary admin", value: adminName || adminEmail ? `${adminName || "—"} · ${adminEmail || "—"}` : "—" },
    { label: "Allowed domain", value: domain || "—" },
    { label: "Activation mode", value: activationMode === "limited" ? "Limited collaboration access" : "Full Claim Matrix access" },
    { label: "Lifecycle", value: lifecycleStatusLabel(lifecycleStatus) },
    { label: "Trust score", value: `${trustScore || "—"} · ${trustStatusLabel(trustStatus)}` },
    { label: "Billing", value: billingPlanLabel(billingPlan) },
  ], [activationMode, adminEmail, adminName, billingPlan, companyId, companyName, domain, lifecycleStatus, trustScore, trustStatus]);

  const updateContact = (index, key, value) => { setContacts((c) => c.map((ct, i) => (i === index ? { ...ct, [key]: value } : ct))); setSaved(false); };
  const addContact = () => { setContacts((c) => [...c, { name: "", email: "", role: "Adjuster" }]); setSaved(false); };
  const removeContact = (index) => { setContacts((c) => c.filter((_, i) => i !== index)); setSaved(false); };
  const toggleCheck = (index, checked) => { setChecks((c) => c.map((item, i) => (i === index ? { ...item, checked } : item))); setSaved(false); };

  const buildPayload = () => ({
    companyId,
    companyName,
    activationMode,
    lifecycleStatus,
    collaborationAccess,
    billingPlan,
    agreementStatus,
    eligibilityCheck: eligibilityStatus,
    trustApproval: trustStatus,
    // Backend field is a nullable int — an empty string fails JSON deserialization
    // (400 before any of our validation runs), so send a real number or null instead.
    trustScore: trustScore.trim() === "" ? null : Number(trustScore),
    subscriptionOwner,
    externalInvitePolicy: externalInvites,
    auditVisibility,
    matrixRetention,
    companyAdmin: adminName,
    adminEmail,
    notificationEmail: supportEmail,
    allowedDomain: domain,
    notes,
    contacts,
    productStatuses,
    checks,
    toggles: {
      autoSyncEnabled,
      structuredSettlement,
      emailNotifications,
      inAppNotifications,
      settlementNotifications,
    },
  });

  const requiredFieldsPresent = companyId.trim().length > 0 && companyName.trim().length > 0 && adminEmail.trim().length > 0;

  const handleSaveDraft = async () => {
    if (!requiredFieldsPresent) {
      toast.error("Company id, company name, and admin email are required.");
      return;
    }
    setSubmitting(true);
    try {
      await submitCompanyOnboarding({ ...buildPayload(), draft: true });
      setSaved(true);
      toast.success("Draft queued — company not created yet. Click \"Activate company\" to create it.");
    } catch (err) {
      toast.error(err.message || "Could not save the onboarding draft.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivate = async () => {
    if (!requiredFieldsPresent) {
      toast.error("Company id, company name, and admin email are required.");
      return;
    }
    if (!activationReady) {
      toast.error("Complete the checklist before activating.");
      return;
    }
    setSubmitting(true);
    try {
      await submitCompanyOnboarding({ ...buildPayload(), draft: false });
      toast.success(isEditMode ? `${companyName} updated.` : `${companyName} activated for Claim Matrix.`);
      navigate("/admin/company-enablement");
    } catch (err) {
      toast.error(err.message || "Could not save the company.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingDetail) {
    return (
      <>
        <PageHeader title="Edit Company" subtitle="Loading company details…" />
        <div className="p-10"><Spinner /></div>
      </>
    );
  }

  if (notFound) {
    return (
      <>
        <PageHeader
          title="Company not found"
          subtitle={`No company matches "${editCode}".`}
          actions={<Button asChild variant="outline" size="sm"><Link to="/admin/company-enablement">Back to Company Enablement</Link></Button>}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={isEditMode ? `Edit Company — ${companyName || editCode}` : "Company Onboarding"}
        subtitle={isEditMode ? "Update this company's Claim Matrix configuration" : "Onboard a new Claim Toolkit company for Claim Matrix collaboration"}
        actions={<Button asChild variant="outline" size="sm"><Link to="/admin/company-enablement">Company enablement</Link></Button>}
      />

      <div className="mb-6"><Stepper steps={["Enablement", "Agreement", "Eligibility", "Trust", "Billing", "Activation"]} current={Math.min(currentStep + 1, 6)} /></div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2 shadow-card border-accent/50">
          <CardContent className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Claim Toolkit company_id">
                <Input
                  value={companyId}
                  disabled={isEditMode}
                  placeholder="ctk-co-1004"
                  onChange={(e) => { setCompanyId(e.target.value); setSaved(false); }}
                />
              </Field>
              <Field label="Company"><Input value={companyName} placeholder="Company name" onChange={(e) => { setCompanyName(e.target.value); setSaved(false); }} /></Field>
              <Field label="Activation mode">
                <Select value={activationMode} onValueChange={(v) => { setActivationMode(v); setSaved(false); }}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="limited">Limited collaboration access</SelectItem><SelectItem value="full">Full Claim Matrix access</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field label="Lifecycle status">
                <Select value={lifecycleStatus} onValueChange={(v) => { setLifecycleStatus(v); setSaved(false); }}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="pending">Pending activation</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="deactivated">Deactivated</SelectItem><SelectItem value="reactivation">Reactivation review</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field label="Collaboration access">
                <Select value={collaborationAccess} onValueChange={(v) => { setCollaborationAccess(v); setSaved(false); }}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="two-party">Two-party collaboration</SelectItem><SelectItem value="multi-party-ready">Two-party now, multi-party ready</SelectItem><SelectItem value="external-only">External participant only</SelectItem><SelectItem value="full-network">Full network collaboration</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field label="Billing plan">
                <Select value={billingPlan} onValueChange={(v) => { setBillingPlan(v); setSaved(false); }}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="pending">Pending setup</SelectItem><SelectItem value="partner">Partner</SelectItem><SelectItem value="enterprise">Enterprise</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field label="Agreement status">
                <Select value={agreementStatus} onValueChange={(v) => { setAgreementStatus(v); setSaved(false); }}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="not-sent">Not sent</SelectItem><SelectItem value="sent">Sent</SelectItem><SelectItem value="accepted">Accepted</SelectItem><SelectItem value="expired">Expired</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field label="Eligibility check">
                <Select value={eligibilityStatus} onValueChange={(v) => { setEligibilityStatus(v); setSaved(false); }}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="matched">Matched Claim Toolkit company</SelectItem><SelectItem value="new-ctk">New Claim Toolkit company</SelectItem><SelectItem value="needs-review">Needs customer service review</SelectItem><SelectItem value="blocked">Blocked</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field label="Trust approval">
                <Select value={trustStatus} onValueChange={(v) => { setTrustStatus(v); setSaved(false); }}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="approved">Approved</SelectItem><SelectItem value="review">Review required</SelectItem><SelectItem value="conditional">Conditional approval</SelectItem><SelectItem value="denied">Denied</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field label="Trust score"><Input value={trustScore} placeholder="0-100" onChange={(e) => { setTrustScore(e.target.value); setSaved(false); }} /></Field>
              <Field label="Primary company admin"><Input value={adminName} placeholder="Jane Doe" onChange={(e) => { setAdminName(e.target.value); setSaved(false); }} /></Field>
              <Field label="Admin email"><Input type="email" value={adminEmail} placeholder="admin@company.com" onChange={(e) => { setAdminEmail(e.target.value); setSaved(false); }} /></Field>
              <Field label="Notification email"><Input type="email" value={supportEmail} placeholder="claims-support@company.com" onChange={(e) => { setSupportEmail(e.target.value); setSaved(false); }} /></Field>
              <Field label="Allowed email domain"><Input value={domain} placeholder="company.com" onChange={(e) => { setDomain(e.target.value); setSaved(false); }} /></Field>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ConfigPanel icon={KeyRound} title="Claim Matrix company extensions">
                <Field label="External invite policy">
                  <Select value={externalInvites} onValueChange={(v) => { setExternalInvites(v); setSaved(false); }}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="approval">Supervisor/admin approval required</SelectItem><SelectItem value="adjuster">Adjusters can invite directly</SelectItem><SelectItem value="disabled">External invites disabled</SelectItem></SelectContent>
                  </Select>
                </Field>
                <ToggleRow label="Claim Toolkit Auto sync" checked={autoSyncEnabled} onChange={setAutoSyncEnabled} />
                <ToggleRow label="Structured settlement capture" checked={structuredSettlement} onChange={setStructuredSettlement} />
              </ConfigPanel>
              <ConfigPanel icon={Bell} title="Notification preferences">
                <Field label="Notification email"><Input type="email" value={supportEmail} onChange={(e) => { setSupportEmail(e.target.value); setSaved(false); }} /></Field>
                <ToggleRow label="Email notifications" checked={emailNotifications} onChange={setEmailNotifications} />
                <ToggleRow label="In-app notifications" checked={inAppNotifications} onChange={setInAppNotifications} />
                <ToggleRow label="Settlement notifications" checked={settlementNotifications} onChange={setSettlementNotifications} />
              </ConfigPanel>
              <ConfigPanel icon={History} title="Audit visibility">
                <Field label="Who can view company audit">
                  <Select value={auditVisibility} onValueChange={(v) => { setAuditVisibility(v); setSaved(false); }}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="company-admins">Company admins only</SelectItem><SelectItem value="supervisors">Admins and supervisors</SelectItem><SelectItem value="all-internal">All internal Claim Toolkit users</SelectItem><SelectItem value="support">Claim Toolkit support only</SelectItem></SelectContent>
                  </Select>
                </Field>
                <Field label="Matrix/audit retention">
                  <Select value={matrixRetention} onValueChange={(v) => { setMatrixRetention(v); setSaved(false); }}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="3-years">3 years</SelectItem><SelectItem value="7-years">7 years</SelectItem><SelectItem value="10-years">10 years</SelectItem><SelectItem value="indefinite">Indefinite / legal hold</SelectItem></SelectContent>
                  </Select>
                </Field>
              </ConfigPanel>
            </div>

            <ProductEnablementSection subscriptionOwner={subscriptionOwner} setSubscriptionOwner={(v) => { setSubscriptionOwner(v); setSaved(false); }} productStatuses={productStatuses} setProductLifecycle={(name, v) => { setProductStatuses((c) => ({ ...c, [name]: v })); setSaved(false); }} />

            <div className="rounded-md border bg-background">
              <div className="flex items-center justify-between border-b px-4 py-3"><div className="font-medium">Notification contacts</div><Button type="button" variant="outline" size="sm" onClick={addContact}><UserPlus className="h-4 w-4" /> Add contact</Button></div>
              <div className="divide-y">
                {contacts.length === 0 && (
                  <div className="p-4 text-xs text-muted-foreground">No contacts yet — add at least one below.</div>
                )}
                {contacts.map((contact, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_1.3fr_160px_auto] gap-3 p-4">
                    <Input aria-label={`Contact ${index + 1} name`} placeholder="Name" value={contact.name} onChange={(e) => updateContact(index, "name", e.target.value)} />
                    <Input aria-label={`Contact ${index + 1} email`} placeholder="Email" type="email" value={contact.email} onChange={(e) => updateContact(index, "email", e.target.value)} />
                    <Select value={contact.role} onValueChange={(v) => updateContact(index, "role", v)}><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{["Supervisor","Adjuster","External Admin","Viewer"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeContact(index)}>Remove</Button>
                  </div>
                ))}
              </div>
            </div>

            <Field label="Onboarding notes"><Textarea value={notes} placeholder="Any context for this company's activation — rollout scope, special billing terms, follow-up items…" onChange={(e) => { setNotes(e.target.value); setSaved(false); }} rows={4} /></Field>

            {checks.map((item, index) => (
              <label key={item.label} className="flex items-center gap-3 rounded-md border bg-background p-3 text-sm">
                <Checkbox checked={item.checked} onCheckedChange={(checked) => toggleCheck(index, checked === true)} />
                <span className="flex-1">{item.label}</span>
                <StatusBadge variant={item.checked ? "success" : "warning"}>{item.checked ? "Complete" : "Review"}</StatusBadge>
              </label>
            ))}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <div className="text-sm text-muted-foreground">
                {isEditMode
                  ? "Use \"Save changes\" in the summary panel to persist edits to this company."
                  : saved
                    ? "Draft queued — this company is not created yet. Use \"Activate company\" in the summary panel to create it."
                    : "This only queues a draft request — it does not create the company. Use \"Activate company\" in the summary panel to create it."}
              </div>
              {!isEditMode && (
                <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={submitting}><Save className="h-4 w-4" /> {submitting ? "Saving…" : "Save as draft (doesn't create the company)"}</Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-accent/50 h-fit">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 font-medium"><FileSignature className="h-4 w-4 text-primary" /> {isEditMode ? "Update summary" : "Activation summary"}</div>
            <div className="rounded-md border bg-background p-4 space-y-3">
              {summary.map((item) => <div key={item.label}><div className="text-xs text-muted-foreground">{item.label}</div><div className="text-sm font-medium">{item.value}</div></div>)}
            </div>
            <div className="rounded-md border bg-muted/35 p-3 text-sm text-muted-foreground">{notes || "No onboarding notes yet."}</div>
            <div className="flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4 text-accent" /> Source of truth remains Claim Toolkit.</div>
            <div className="flex items-center gap-2 text-sm"><RotateCcw className="h-4 w-4 text-accent" /> Activation lifecycle can be enabled, disabled, or reactivated.</div>
            <div className="flex items-center justify-between text-sm"><span>Checklist</span><StatusBadge variant={activationReady ? "success" : "warning"}>{completedChecks}/{checks.length} complete</StatusBadge></div>
            <Button className="w-full" variant={activationReady ? "success" : "outline"} onClick={handleActivate} disabled={submitting}>
              <CheckCircle2 className="h-4 w-4" /> {submitting ? "Saving…" : isEditMode ? "Save changes" : activationReady ? "Activate company" : "Complete checklist to activate"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
