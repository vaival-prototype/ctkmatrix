import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import DetailRow from "@/components/shared/DetailRow";
import Stepper from "@/components/shared/Stepper";
import Spinner from "@/components/shared/Spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useClaimPackages } from "@/hooks/useClaimPackages";
import { useCompanies } from "@/hooks/useCompanies";
import { useAccessTier } from "@/hooks/useAccessTier";
import { createClaimMatrix } from "@/services/claimService";
import { pickData } from "@/services/api";
import { US_STATES, ACCIDENT_TYPES, SCENE_CONDITIONS } from "@/constants/usStates";
import {
  ArrowLeft, ArrowRightLeft, Building2, CheckCircle2, FileText, Lock, Mail,
  MessageSquareWarning, PenLine, ShieldCheck, Upload, UserPlus, Workflow,
} from "lucide-react";

const STEP_LABELS = ["Origin", "Details", "Documents", "Recipient", "Review & Send", "Collaboration"];

const TIER_ORIGIN_COPY = {
  level3: {
    title: "Claim Toolkit Auto",
    body: "Your account is a Level 3 (CTK Auto) user, so matrices you initiate always pull from an existing Claim Toolkit Auto claim — assessment, liability data, and documents come across automatically.",
  },
  level2: {
    title: "Manual entry",
    body: "Level 2 (CTK Compliance) users have no Claim Toolkit Auto claim behind a matter, so matrices are entered directly: accident facts, location, and documents are captured by hand and the matrix opens straight into negotiation.",
  },
};

function wizardTitle(step, origin) {
  return [
    "How this matrix will start",
    origin === "auto" ? "Select claim from Auto" : "Claim details",
    origin === "auto" ? "Select package contents" : "Upload documents",
    "Choose recipient & invite",
    "Review & send",
    "Shared collaboration space",
  ][step - 1] ?? "Review";
}

function Field({ label, children, className }) {
  return <div className={`space-y-1.5 ${className ?? ""}`}><Label className="text-xs">{label}</Label>{children}</div>;
}

function NotificationPreview({ icon: Icon, label, value }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5 text-accent" /> {label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function PackageFact({ icon: Icon, label, value }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5 text-accent" /> {label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function HandoffStep({ title, body }) {
  return (
    <div className="rounded-md border border-accent/35 bg-background p-3">
      <div className="font-semibold text-foreground">{title}</div>
      <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</div>
    </div>
  );
}

export default function NewSharedClaim() {
  const [searchParams] = useSearchParams();
  const appHint = ["level2"].includes(searchParams.get("app")) ? searchParams.get("app") : null;

  const { data: packages, loading: packagesLoading } = useClaimPackages();
  const { data: companiesData } = useCompanies();
  const { tierKey, capabilities } = useAccessTier();

  // Level 3 (CTK Auto) users can start either from an existing Auto claim or
  // enter the matter manually — Auto brings assessment data across
  // automatically but isn't the only starting point. Level 2 (CTK
  // Compliance) has no Auto claim behind its matters, so it's locked to
  // manual entry, same as an embedded Compliance/Audit origin hint.
  const originTierKey = appHint || tierKey;
  const canChooseOrigin = tierKey === "level3" && !appHint;
  // Level 2 (CTK Compliance) sees both starting-point options, same as Level
  // 3, but the Auto card is shown locked with an upgrade message rather than
  // hidden outright — makes clear what unlocks with a CTK Auto account.
  const showOriginPicker = tierKey === "level3" || originTierKey === "level2";
  const autoOptionLocked = originTierKey === "level2" && tierKey !== "level3";
  const [originChoice, setOriginChoice] = useState(null);
  const origin = canChooseOrigin ? (originChoice ?? "auto") : (originTierKey === "level3" ? "auto" : "manual");
  const originCopy = TIER_ORIGIN_COPY[originTierKey] ?? TIER_ORIGIN_COPY.level2;

  const [step, setStep] = useState(1);

  // Auto-origin fields — mirrors Claim Toolkit Auto's own "Find Claim to Add" search
  const [selectedClaimId, setSelectedClaimId] = useState(null);
  const [findClaimNumber, setFindClaimNumber] = useState("");
  const [findInsured, setFindInsured] = useState("");
  const [findAdjuster, setFindAdjuster] = useState("");
  const [findSearched, setFindSearched] = useState(false);

  // Manual-origin fields — claim basics, mirroring Claim Toolkit Auto's own
  // "Add Manual" claim form so the data captured here is the same shape.
  const [claimNumber, setClaimNumber] = useState("");
  const [insuredName, setInsuredName] = useState("");
  const [dateOfLoss, setDateOfLoss] = useState(() => new Date().toISOString().slice(0, 10));
  const [accidentState, setAccidentState] = useState("");

  // Manual-origin fields — location, details and type
  const [accidentFacts, setAccidentFacts] = useState("");
  const [timeOfLossUnknown, setTimeOfLossUnknown] = useState(true);
  const [timeOfLoss, setTimeOfLoss] = useState("");
  const [accidentType, setAccidentType] = useState("Left Turn");
  const [centerTurnLane, setCenterTurnLane] = useState("No");
  const [lossLocationStreet, setLossLocationStreet] = useState("");
  const [lossLocationUnknown, setLossLocationUnknown] = useState(false);
  const [speedLimit, setSpeedLimit] = useState("");
  const [speedLimitUnknown, setSpeedLimitUnknown] = useState(false);
  const [numVehicles, setNumVehicles] = useState("2");
  const [numParties, setNumParties] = useState("2");
  const [numWitnesses, setNumWitnesses] = useState("0");
  const [policeAtScene, setPoliceAtScene] = useState(false);
  const [noPoliceReport, setNoPoliceReport] = useState(false);
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [sceneConditions, setSceneConditions] = useState([]);
  const [fileNames, setFileNames] = useState([]);

  // Shared fields
  // Recipient: either an existing company already in Matrix, or a party who
  // isn't in the dropdown yet — a company not yet onboarded (routed through
  // the holding queue) or an individual claim party (Level 4, receive-only,
  // no chat). Mirrors Mark's origination flow: "the receiving party may be
  // an insurance company... or an individual party to the case."
  const [recipientMode, setRecipientMode] = useState("existing");
  const [recipientCompany, setRecipientCompany] = useState("");
  const [recipientAdjuster, setRecipientAdjuster] = useState("maria.chen@atlasmutual.com");
  const [newRecipientType, setNewRecipientType] = useState("company");
  const [newRecipientName, setNewRecipientName] = useState("");
  const [newRecipientEmail, setNewRecipientEmail] = useState("");
  const [invitedEmail, setInvitedEmail] = useState("claims-supervisor@atlasmutual.com");
  const [permissionScope, setPermissionScope] = useState("comment-evidence");
  const [message, setMessage] = useState(
    "Please review the shared liability assessment and supporting documents. We are requesting confirmation or structured dispute response within 7 business days."
  );
  const [submitting, setSubmitting] = useState(false);
  const [createdMatrixId, setCreatedMatrixId] = useState(null);

  const claimPackageOptions = packages ?? [];
  const filteredClaimPackages = useMemo(() => {
    if (!findSearched) return claimPackageOptions;
    const num = findClaimNumber.trim().toLowerCase();
    const insured = findInsured.trim().toLowerCase();
    const adjuster = findAdjuster.trim().toLowerCase();
    return claimPackageOptions.filter((claim) =>
      (!num || claim.id.toLowerCase().includes(num)) &&
      (!insured || (claim.insured || "").toLowerCase().includes(insured)) &&
      (!adjuster || (claim.adjuster || "").toLowerCase().includes(adjuster))
    );
  }, [claimPackageOptions, findSearched, findClaimNumber, findInsured, findAdjuster]);
  const companies = companiesData ?? [];
  const recipientCompanies = companies.filter((company) => company.name !== "Northbridge Insurance");
  const selectedClaim = claimPackageOptions.find((claim) => claim.id === selectedClaimId) ?? claimPackageOptions[0];
  const selectedRecipientCompanyName = recipientCompanies.find((c) => c.id === recipientCompany)?.name ?? "";
  // What actually goes to the API and shows in the review panel, whichever
  // recipient mode is active.
  const recipientDisplayName = recipientMode === "existing" ? selectedRecipientCompanyName : newRecipientName;
  const recipientEmailForDisplay = recipientMode === "existing" ? recipientAdjuster : newRecipientEmail;
  const totalSteps = 6;
  const showReviewSidebar = step === 4 || step === 5;
  // Level 1 (receive-only) and Level 4 (Claim Party) can't initiate at all —
  // the wizard body is shown for reference (blurred, non-interactive) below
  // the upgrade banner, rather than staying fully usable behind a label.
  const blocked = !capabilities.initiate;

  const matterTitle = useMemo(
    () => (accidentFacts ? `${accidentType} — ${accidentFacts.slice(0, 60)}` : claimNumber ? `Matter ${claimNumber}` : "Untitled matter"),
    [accidentFacts, accidentType, claimNumber],
  );

  useEffect(() => {
    document.title = "Initiate Matrix - Claim Matrix";
  }, []);

  useEffect(() => {
    if (!selectedClaimId && claimPackageOptions.length) setSelectedClaimId(claimPackageOptions[0].id);
  }, [claimPackageOptions, selectedClaimId]);

  useEffect(() => {
    if (!recipientCompany && recipientCompanies.length) setRecipientCompany(recipientCompanies[0].id);
  }, [recipientCompanies, recipientCompany]);

  function toggleSceneCondition(condition) {
    setSceneConditions((prev) => (prev.includes(condition) ? prev.filter((c) => c !== condition) : [...prev, condition]));
  }

  function handleFileSelect(e) {
    const names = Array.from(e.target.files || []).map((f) => f.name);
    setFileNames((prev) => [...prev, ...names]);
  }

  async function handleCreate() {
    if (blocked) return;
    setSubmitting(true);
    try {
      const recipientFields = {
        recipientCompany: recipientDisplayName,
        recipientAdjuster: recipientEmailForDisplay,
        recipientType: recipientMode === "existing" ? "company" : newRecipientType,
        recipientIsNew: recipientMode === "new",
      };
      const payload = origin === "auto"
        ? {
            autoClaimId: selectedClaimId,
            originApp: "auto",
            title: selectedClaim?.title,
            ...recipientFields,
            invitedEmail,
            permissionScope,
            message,
            includedDocuments: selectedClaim?.documents ?? [],
          }
        : {
            autoClaimId: null,
            originApp: originTierKey,
            title: matterTitle,
            claimNumber,
            insuredName,
            dateOfLoss,
            accidentState,
            accidentFacts,
            timeOfLoss: timeOfLossUnknown ? "Unknown" : timeOfLoss,
            accidentType,
            centerTurnLane,
            lossLocationStreet: lossLocationUnknown ? "Unknown" : lossLocationStreet,
            speedLimit: speedLimitUnknown ? "Unknown / NA" : speedLimit,
            numVehicles,
            numParties,
            numWitnesses,
            policeAtScene,
            noPoliceReport,
            city,
            zip,
            sceneConditions,
            ...recipientFields,
            invitedEmail,
            permissionScope,
            message,
            includedDocuments: fileNames,
          };
      const res = await createClaimMatrix(payload);
      setCreatedMatrixId(pickData(res)?.id ?? null);
      setStep(totalSteps);
      toast.success("Matrix created");
    } catch (err) {
      toast.error(err.message || "Failed to create matrix");
    } finally {
      setSubmitting(false);
    }
  }

  function canContinue() {
    if (blocked) return false;
    if (step === 2 && origin === "manual") return claimNumber.trim().length > 0 || insuredName.trim().length > 0;
    if (step === 4) {
      return recipientMode === "existing"
        ? !!recipientCompany
        : newRecipientName.trim().length > 0 && newRecipientEmail.trim().length > 0;
    }
    return true;
  }

  return (
    <>
      <PageHeader
        title="Initiate Matrix"
        subtitle="Start a shared matrix from a Claim Toolkit Auto claim, or enter the matter directly — both land in the same collaboration space"
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/claims"><ArrowLeft className="h-4 w-4" /> Back to claims</Link>
          </Button>
        }
      />

      {blocked && (
        <Card className="mb-5 border-warning/60 bg-warning/10">
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <MessageSquareWarning className="h-5 w-5 shrink-0 text-warning-foreground" />
            <div className="flex-1 text-sm">
              <div className="font-semibold text-warning-foreground">
                {tierKey === "level4" ? "Claim Party accounts can't initiate a matrix" : "Upgrade required to initiate a matrix"}
              </div>
              <div className="mt-0.5 text-muted-foreground">
                {tierKey === "level4"
                  ? "This account receives matrices only. The steps below are shown for reference and can't be completed."
                  : "Your account receives matrices only — upgrade to a CTK Compliance or CTK Auto account to initiate. The steps below are shown for reference and can't be completed."}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className={blocked ? "pointer-events-none select-none opacity-50 blur-[1.5px]" : undefined}>
      <div className="mb-6">
        <Stepper steps={STEP_LABELS} current={step} />
      </div>

      {step === 1 && (
        <Card className="mb-5 border-accent/70 bg-card shadow-card">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-3 text-sm lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
              <HandoffStep title="1. Starting point" body={showOriginPicker ? (canChooseOrigin ? "Choose below — pull from an existing Claim Toolkit Auto claim, or enter the matter directly." : "Manual entry only on this account — Claim Toolkit Auto is available on a CTK Auto account.") : "Determined by your access level."} />
              <div className="hidden text-accent lg:block">{"->"}</div>
              <HandoffStep title="2. Add details" body="Auto brings assessment, liability, and evidence automatically. Manual entry captures accident facts and location, and lets you upload documents directly." />
              <div className="hidden text-accent lg:block">{"->"}</div>
              <HandoffStep title="3. Begin collaboration" body="Claim Matrix creates the shared space, invites recipients, triggers notifications, and logs audit — identical from here on." />
            </div>
          </CardContent>
        </Card>
      )}

      {/* The review panel only makes sense once there is something to review —
          showing it (with its own send button) from step 1 let people jump
          straight to "Create Matrix" before filling anything in, and its
          fields didn't track whichever step was actually active. */}
      <div className={`grid grid-cols-1 gap-5 ${showReviewSidebar ? "xl:grid-cols-3" : ""}`}>
        <Card className={showReviewSidebar ? "xl:col-span-2 shadow-card border-accent/50" : "shadow-card border-accent/50"}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base">{wizardTitle(step, origin)}</CardTitle>
              <StatusBadge variant={origin === "auto" ? "success" : "info"}>
                Source: {origin === "auto" ? "Claim Toolkit Auto" : "Manual entry"}
              </StatusBadge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {step === 1 && showOriginPicker && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { key: "auto", icon: Workflow, title: "Claim Toolkit Auto", body: "Pull an existing Auto claim — assessment, liability data, and documents come across automatically.", locked: autoOptionLocked },
                  { key: "manual", icon: PenLine, title: "Manual entry", body: "Enter accident facts and location by hand, upload documents directly, and open straight into negotiation.", locked: false },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const selected = origin === opt.key;
                  const interactive = canChooseOrigin && !opt.locked;
                  return (
                    <button
                      type="button"
                      key={opt.key}
                      disabled={opt.locked}
                      onClick={() => interactive && setOriginChoice(opt.key)}
                      aria-disabled={opt.locked}
                      className={`relative flex items-start gap-3 overflow-hidden rounded-md border p-4 text-left transition ${
                        opt.locked
                          ? "cursor-not-allowed border-border"
                          : selected
                          ? "border-accent bg-accent/5"
                          : "border-border hover:border-accent/50"
                      }`}
                    >
                      <div className={opt.locked ? "flex flex-1 items-start gap-3 blur-[2px] opacity-60" : "flex flex-1 items-start gap-3"}>
                        <CheckCircle2 className={`mt-0.5 h-5 w-5 shrink-0 ${selected && !opt.locked ? "text-accent" : "text-muted-foreground/40"}`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 font-semibold">
                            <Icon className="h-4 w-4 text-accent" /> {opt.title}
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">{opt.body}</div>
                        </div>
                      </div>
                      {opt.locked && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/40">
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-warning/60 bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning-foreground shadow-sm">
                            <Lock className="h-3 w-3" /> Upgrade to CTK Auto for this option
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {step === 1 && !showOriginPicker && (
              <div className="flex cursor-default items-start gap-3 rounded-md border border-accent bg-accent/5 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-semibold">
                    {origin === "auto" ? <Workflow className="h-4 w-4 text-accent" /> : <PenLine className="h-4 w-4 text-accent" />} {originCopy.title}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{originCopy.body}</div>
                </div>
              </div>
            )}

            {step === 2 && origin === "auto" && (
              packagesLoading ? <Spinner /> : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
                    <Field label="Claim number">
                      <Input value={findClaimNumber} onChange={(e) => setFindClaimNumber(e.target.value)} placeholder="Search" />
                    </Field>
                    <Field label="Insured">
                      <Input value={findInsured} onChange={(e) => setFindInsured(e.target.value)} />
                    </Field>
                    <Field label="Adjuster">
                      <Input value={findAdjuster} onChange={(e) => setFindAdjuster(e.target.value)} />
                    </Field>
                    <Button type="button" variant="success" onClick={() => setFindSearched(true)}>Search</Button>
                  </div>
                  <div className="text-xs text-muted-foreground">Only Top 300 Records Displayed (Green Claims Have Been Entered)</div>
                  <div className="rounded-lg border bg-background overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Claim Number</TableHead>
                          <TableHead>Insured</TableHead>
                          <TableHead>Adjuster</TableHead>
                          <TableHead>Loss Description</TableHead>
                          <TableHead>Contributing Factor</TableHead>
                          <TableHead>Date of Loss</TableHead>
                          <TableHead>Loss Location</TableHead>
                          <TableHead>Loss City</TableHead>
                          <TableHead>State of Loss</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredClaimPackages.length === 0 ? (
                          <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">No Results for That Search.</TableCell></TableRow>
                        ) : (
                          filteredClaimPackages.map((claim) => (
                            <TableRow
                              key={claim.id}
                              onClick={() => setSelectedClaimId(claim.id)}
                              className={`cursor-pointer ${claim.id === selectedClaimId ? "bg-success/10" : ""}`}
                            >
                              <TableCell className={claim.id === selectedClaimId ? "font-semibold text-success" : "font-medium text-accent"}>{claim.id}</TableCell>
                              <TableCell>{claim.insured}</TableCell>
                              <TableCell>{claim.adjuster}</TableCell>
                              <TableCell>{claim.lossDescription}</TableCell>
                              <TableCell>{claim.contributingFactor}</TableCell>
                              <TableCell>{claim.lossDate}</TableCell>
                              <TableCell>{claim.lossLocation}</TableCell>
                              <TableCell>{claim.lossCity}</TableCell>
                              <TableCell>{claim.stateOfLoss}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {selectedClaim && (
                    <div className="rounded-md border border-success/50 bg-success/5 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge variant="success">Selected</StatusBadge>
                        <span className="font-semibold">{selectedClaim.id}</span>
                        <span className="text-sm text-muted-foreground">{selectedClaim.title}</span>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                        <span>Loss: {selectedClaim.lossDate}</span>
                        <span>Assessment: {selectedClaim.assessment}</span>
                        <span>Liability: {selectedClaim.suggestedLiability}</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            )}

            {step === 2 && origin === "manual" && (
              <div className="space-y-5">
                <div>
                  <div className="mb-2 text-sm font-semibold">Claim basics</div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Claim number"><Input value={claimNumber} onChange={(e) => setClaimNumber(e.target.value)} placeholder="e.g. invisible-ai-test" /></Field>
                    <Field label="Insured name"><Input value={insuredName} onChange={(e) => setInsuredName(e.target.value)} placeholder="Insured party name" /></Field>
                    <Field label="Date of loss"><Input type="date" value={dateOfLoss} onChange={(e) => setDateOfLoss(e.target.value)} /></Field>
                    <Field label="Accident state">
                      <Select value={accidentState} onValueChange={setAccidentState}>
                        <SelectTrigger><SelectValue placeholder="Please select one" /></SelectTrigger>
                        <SelectContent>
                          {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </div>

                <div className="border-t pt-5">
                  <div className="mb-2 text-sm font-semibold">Location, details and type</div>
                  <div className="space-y-4">
                    <Field label="Brief accident facts">
                      <Textarea rows={2} value={accidentFacts} onChange={(e) => setAccidentFacts(e.target.value)} placeholder="e.g. 2 cars accident" />
                    </Field>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Time of loss</Label>
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox checked={timeOfLossUnknown} onCheckedChange={(v) => setTimeOfLossUnknown(!!v)} /> Unknown
                        </label>
                        {!timeOfLossUnknown && <Input type="time" value={timeOfLoss} onChange={(e) => setTimeOfLoss(e.target.value)} />}
                      </div>
                      <Field label="Accident type">
                        <Select value={accidentType} onValueChange={setAccidentType}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{ACCIDENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      </Field>
                      <Field label="Center turn lane">
                        <Select value={centerTurnLane} onValueChange={setCenterTurnLane}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
                        </Select>
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-5 rounded-md border bg-background p-4">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-xs">Loss location (street)</Label>
                          <Input className="mt-1.5" value={lossLocationStreet} disabled={lossLocationUnknown} onChange={(e) => setLossLocationStreet(e.target.value)} placeholder="Street address" />
                          <label className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                            <Checkbox checked={lossLocationUnknown} onCheckedChange={(v) => setLossLocationUnknown(!!v)} /> Loss location unknown
                          </label>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <Field label="Number of vehicles"><Input type="number" min="0" value={numVehicles} onChange={(e) => setNumVehicles(e.target.value)} /></Field>
                          <Field label="Number of parties"><Input type="number" min="0" value={numParties} onChange={(e) => setNumParties(e.target.value)} /></Field>
                          <Field label="Witnesses"><Input type="number" min="0" value={numWitnesses} onChange={(e) => setNumWitnesses(e.target.value)} /></Field>
                        </div>
                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center gap-2 text-sm"><Checkbox checked={policeAtScene} onCheckedChange={(v) => setPoliceAtScene(!!v)} /> Police at scene?</label>
                          <label className="flex items-center gap-2 text-sm"><Checkbox checked={noPoliceReport} onCheckedChange={(v) => setNoPoliceReport(!!v)} /> No police report</label>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <Field label="City"><Input value={city} onChange={(e) => setCity(e.target.value)} /></Field>
                          <Field label="Zip"><Input value={zip} onChange={(e) => setZip(e.target.value)} /></Field>
                          <Field label="State"><Input value={accidentState} disabled className="bg-muted/40" /></Field>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Speed limit">
                            <Input type="number" min="0" value={speedLimit} disabled={speedLimitUnknown} onChange={(e) => setSpeedLimit(e.target.value)} />
                          </Field>
                          <div className="flex items-end pb-2">
                            <label className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Checkbox checked={speedLimitUnknown} onCheckedChange={(v) => setSpeedLimitUnknown(!!v)} /> Speed limit unknown / NA
                            </label>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Scene conditions</Label>
                        {SCENE_CONDITIONS.map((condition) => (
                          <label key={condition} className="flex items-center gap-2 text-sm">
                            <Checkbox checked={sceneConditions.includes(condition)} onCheckedChange={() => toggleSceneCondition(condition)} /> {condition}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && origin === "auto" && (
              <div className="rounded-lg border bg-background">
                <div className="border-b px-4 py-3 text-sm font-medium">Select documents / assessment data / liability data</div>
                <div className="divide-y">
                  {(selectedClaim?.documents ?? []).map((document, index) => (
                    <label key={document} className="flex items-center gap-3 px-4 py-3 text-sm">
                      <Checkbox defaultChecked={index < 2} />
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="flex-1">{document}</span>
                      <StatusBadge variant={index < 2 ? "success" : "muted"}>{index < 2 ? "Selected" : "Optional"}</StatusBadge>
                    </label>
                  ))}
                  {[
                    "Structured liability assessment",
                    "Suggested liability split",
                    "Evidence references",
                    "Claim metadata summary",
                  ].map((item) => (
                    <label key={item} className="flex items-center gap-3 px-4 py-3 text-sm">
                      <Checkbox defaultChecked />
                      <ShieldCheck className="h-4 w-4 text-accent" />
                      <span className="flex-1">{item}</span>
                      <StatusBadge variant="success">Required</StatusBadge>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && origin === "manual" && (
              <div className="space-y-3">
                <div className="rounded-lg border-2 border-dashed border-accent/40 bg-background p-6 text-center">
                  <Upload className="mx-auto h-8 w-8 text-accent" />
                  <p className="mt-2 text-sm text-muted-foreground">Upload supporting documents directly — there is no Auto package to pull from.</p>
                  <label className="mt-3 inline-block cursor-pointer">
                    <span className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">Choose files</span>
                    <input type="file" multiple className="hidden" onChange={handleFileSelect} />
                  </label>
                </div>
                {fileNames.length > 0 && (
                  <div className="rounded-md border bg-background divide-y">
                    {fileNames.map((name, i) => (
                      <div key={`${name}-${i}`} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                        <FileText className="h-4 w-4 text-primary" /><span className="flex-1">{name}</span><StatusBadge variant="success">Ready</StatusBadge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRecipientMode("existing")}
                    className={`flex-1 rounded-md border px-3 py-2 text-left text-sm transition ${recipientMode === "existing" ? "border-accent bg-accent/5 font-medium" : "border-border hover:border-accent/50"}`}
                  >
                    Existing company
                    <div className="mt-0.5 text-xs font-normal text-muted-foreground">Already onboarded to Claim Matrix</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientMode("new")}
                    className={`flex-1 rounded-md border px-3 py-2 text-left text-sm transition ${recipientMode === "new" ? "border-accent bg-accent/5 font-medium" : "border-border hover:border-accent/50"}`}
                  >
                    New company or individual
                    <div className="mt-0.5 text-xs font-normal text-muted-foreground">Not in the list yet — company or a direct claim party</div>
                  </button>
                </div>

                {recipientMode === "existing" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Recipient company">
                      {recipientCompanies.length === 0 ? (
                        <div className="rounded-md border border-warning/50 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
                          No companies found. Use "New company or individual" instead.
                        </div>
                      ) : (
                        <Select value={recipientCompany} onValueChange={setRecipientCompany}>
                          <SelectTrigger><SelectValue placeholder="Select a company" /></SelectTrigger>
                          <SelectContent>
                            {recipientCompanies.map((company) => (
                              <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </Field>
                    <Field label="Recipient adjuster">
                      <Input value={recipientAdjuster} onChange={(e) => setRecipientAdjuster(e.target.value)} />
                    </Field>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Recipient type">
                        <Select value={newRecipientType} onValueChange={setNewRecipientType}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="company">Company (not yet in Matrix)</SelectItem>
                            <SelectItem value="individual">Individual claim party</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label={newRecipientType === "individual" ? "Individual's name" : "Company name"}>
                        <Input value={newRecipientName} onChange={(e) => setNewRecipientName(e.target.value)} placeholder={newRecipientType === "individual" ? "e.g. Dana Whitfield" : "e.g. Meridian Claims Group"} />
                      </Field>
                    </div>
                    <Field label="Contact email">
                      <Input type="email" value={newRecipientEmail} onChange={(e) => setNewRecipientEmail(e.target.value)} placeholder="name@example.com" />
                    </Field>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {newRecipientType === "individual"
                        ? "Added directly as a Claim Party (Level 4) — receive-only access to this matrix: see authorized evidence, upload evidence, and respond to offers. No chat, no company-wide access."
                        : "Not yet onboarded to Claim Matrix — this company is routed to the holding queue and notified by email until they accept and complete setup."}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Invite another party by email">
                    <Input value={invitedEmail} onChange={(e) => setInvitedEmail(e.target.value)} />
                  </Field>
                  <Field label="Permission scope">
                    <Select value={permissionScope} onValueChange={setPermissionScope}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="view">View only</SelectItem>
                        <SelectItem value="comment-evidence">Comment and evidence</SelectItem>
                        <SelectItem value="settlement">Comment, evidence, settlement</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field label="Message to recipient">
                  <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
                </Field>
              </div>
            )}

            {step === 5 && origin === "auto" && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <PackageFact icon={ArrowRightLeft} label="Handoff event" value="auto.package.shared" />
                  <PackageFact icon={Building2} label="Source company" value="Northbridge Insurance" />
                  <PackageFact icon={FileText} label="Included files" value={`${selectedClaim?.documents?.length ?? 0} documents`} />
                  <PackageFact icon={CheckCircle2} label="Metadata snapshot" value={selectedClaim?.assessment ?? "—"} />
                </div>
                <div className="rounded-md border bg-background p-4">
                  <div className="font-medium">Notifications to trigger</div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                    <NotificationPreview icon={Mail} label="Email recipient" value={recipientAdjuster} />
                    <NotificationPreview icon={UserPlus} label="Invite external party" value={invitedEmail} />
                    <NotificationPreview icon={ShieldCheck} label="Audit event" value="Shared matrix created" />
                  </div>
                </div>
              </div>
            )}

            {step === 5 && origin === "manual" && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <PackageFact icon={Building2} label="Origin" value={`Manual entry (${originTierKey})`} />
                  <PackageFact icon={FileText} label="Uploaded files" value={`${fileNames.length} documents`} />
                  <PackageFact icon={ShieldCheck} label="Entry stage" value="Negotiation (no assessment)" />
                  <PackageFact icon={CheckCircle2} label="Accident type" value={accidentType} />
                </div>
                <div className="rounded-md border bg-background p-4">
                  <div className="mb-2 font-medium">Claim details captured</div>
                  <DetailRow label="Claim number" value={claimNumber || "—"} />
                  <DetailRow label="Insured name" value={insuredName || "—"} />
                  <DetailRow label="Date of loss" value={dateOfLoss || "—"} />
                  <DetailRow label="Loss location" value={lossLocationUnknown ? "Unknown" : [lossLocationStreet, city, accidentState, zip].filter(Boolean).join(", ") || "—"} />
                  <DetailRow label="Vehicles / parties / witnesses" value={`${numVehicles} / ${numParties} / ${numWitnesses}`} />
                  <DetailRow label="Scene conditions" value={sceneConditions.length ? sceneConditions.join(", ") : "None noted"} />
                </div>
                <div className="rounded-md border bg-background p-4">
                  <div className="font-medium">Notifications to trigger</div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                    <NotificationPreview icon={Mail} label="Email recipient" value={recipientAdjuster} />
                    <NotificationPreview icon={UserPlus} label="Invite external party" value={invitedEmail} />
                    <NotificationPreview icon={ShieldCheck} label="Audit event" value="matrix.created (manual entry)" />
                  </div>
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="rounded-md border border-accent/50 bg-accent/5 p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-accent text-accent-foreground">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h2 className="mt-4 text-xl font-semibold">Matrix created</h2>
                <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                  {origin === "auto"
                    ? "Claim Matrix created an extended copy/summary, invited recipients, triggered notifications, and opened the collaboration space."
                    : "Claim Matrix opened a negotiation-stage matter, invited recipients, triggered notifications, and opened the collaboration space."}
                </p>
                <Button asChild className="mt-5" variant="success">
                  <Link to={createdMatrixId ? `/claims/${createdMatrixId}` : "/claims"}>Begin Collaboration</Link>
                </Button>
              </div>
            )}

            {step < totalSteps && (
              <div className="flex items-center justify-between border-t pt-4">
                <Button type="button" variant="outline" disabled={step === 1} onClick={() => setStep((current) => Math.max(1, current - 1))}>
                  Back
                </Button>
                <Button
                  type="button"
                  variant="success"
                  disabled={submitting || !canContinue()}
                  onClick={() => (step >= 5 ? handleCreate() : setStep((current) => Math.min(totalSteps, current + 1)))}
                >
                  {step >= 5 ? (submitting ? "Sending…" : "Send Matrix") : "Continue"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {showReviewSidebar && (
          <Card className="shadow-card border-accent/50 h-fit">
            <CardHeader>
              <CardTitle className="text-base">Review before sending</CardTitle>
            </CardHeader>
            <CardContent>
              {origin === "auto" ? (
                <>
                  <DetailRow label="Auto claim" value={selectedClaim?.id ?? "—"} />
                  <DetailRow label="Loss date" value={selectedClaim?.lossDate ?? "—"} />
                  <DetailRow label="Assessment" value={selectedClaim?.assessment ?? "—"} />
                  <DetailRow label="Suggested liability" value={selectedClaim?.suggestedLiability ?? "—"} />
                </>
              ) : (
                <>
                  <DetailRow label="Claim number" value={claimNumber || "—"} />
                  <DetailRow label="Insured name" value={insuredName || "—"} />
                  <DetailRow label="Accident type" value={accidentType} />
                  <DetailRow label="Entry stage" value="Negotiation (no assessment)" />
                  <DetailRow label="Documents" value={`${fileNames.length} uploaded`} />
                </>
              )}
              <DetailRow
                label="Recipient"
                value={recipientDisplayName ? `${recipientDisplayName}${recipientMode === "new" ? ` (${newRecipientType === "individual" ? "new · claim party" : "new · holding queue"})` : ""}` : "—"}
              />
              <DetailRow label="Access" value="Comment and evidence" />
              <DetailRow label="Wizard state" value={wizardTitle(step, origin)} />
              {step === 5 && (
                <div className="mt-5">
                  <Button asChild variant="outline" className="w-full"><Link to="/claims"><Mail className="h-4 w-4" /> Save draft</Link></Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      </div>
    </>
  );
}
