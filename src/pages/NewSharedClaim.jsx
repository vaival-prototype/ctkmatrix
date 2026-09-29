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
import { useAccessTier } from "@/hooks/useAccessTier";
import { useAuth } from "@/context/AuthContext";
import InviteesField from "@/components/shared/InviteesField";
import EmptyState from "@/components/shared/EmptyState";
import { emptyInvitee, toInviteePayload, validateInvitees } from "@/utils/invitees";
import { resolveLookups } from "@/utils/inviteeLookup";
import { createClaimMatrix } from "@/services/claimService";
import { pickData } from "@/services/api";
import { US_STATES, ACCIDENT_TYPES, SCENE_CONDITIONS } from "@/constants/usStates";
import {
  ArrowLeft, ArrowRightLeft, ArrowUpCircle, Building2, CheckCircle2, FileText, Lock, Mail,
  MessageSquareWarning, PenLine, ShieldCheck, Upload, Workflow,
} from "lucide-react";

const STEP_LABELS = ["Origin", "Details", "Documents", "Recipient", "Review & Send", "Collaboration"];

const INVITE_STATUS_VARIANT = {
  Active: "success",
  Invited: "info",
  "Awaiting password": "info",
  "Already in this claim": "muted",
};

const LEVEL_LABEL = { admin: "Admin", approver: "Approver", level1: "Level 1", level2: "Level 2", level3: "Level 3", level4: "Level 4" };

function wizardTitle(step, origin) {
  return [
    "How this matrix will start",
    origin === "auto" ? "Select claim from Auto" : "Claim details",
    origin === "auto" ? "Select package contents" : "Upload documents",
    "Choose who to invite",
    "Review & send",
    "Shared collaboration space",
  ][step - 1] ?? "Review";
}

function Field({ label, children, className }) {
  return <div className={`space-y-1.5 ${className ?? ""}`}><Label className="text-xs">{label}</Label>{children}</div>;
}

function PackageFact({ icon: Icon, label, value }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5 text-accent" /> {label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function InviteeSummary({ invitees }) {
  return (
    <div className="rounded-md border bg-background p-4">
      <div className="font-medium">Invitations to send</div>
      <ul className="mt-3 space-y-2 text-sm">
        {invitees.map((i) => (
          <li key={i.key} className="flex flex-wrap items-center justify-between gap-2">
            <span className="min-w-0">
              <span className="font-medium">{i.lookup?.known ? i.lookup.name : i.name}</span>{" "}
              <span className="text-muted-foreground">{i.email}</span>
            </span>
            <StatusBadge variant={i.lookup?.known ? "success" : "info"}>
              {i.lookup?.known
                ? `Joins now · ${i.lookup.tierLabel}`
                : i.type === "claim-party"
                  ? "New · Level 4 · sets a password"
                  : "New · Level 1 · needs approval"}
            </StatusBadge>
          </li>
        ))}
      </ul>
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
  // Embedded Compliance/Audit entry points open straight into manual entry.
  const forceManual = searchParams.get("mode") === "manual" || searchParams.get("app") === "level2";

  const { user } = useAuth();
  const { tierKey, capabilities, loading: tierLoading } = useAccessTier();
  const canUseAuto = !!capabilities.initiateFromAuto;
  const { data: packages, loading: packagesLoading } = useClaimPackages();

  // Admin and Level 3 choose Auto (their own ready claims) or manual entry;
  // Level 2 is manual entry only (the Auto card is shown locked).
  const canChooseOrigin = canUseAuto && !forceManual;
  const showOriginPicker = !!capabilities.initiate;
  const autoOptionLocked = !canUseAuto;
  const [originChoice, setOriginChoice] = useState(null);
  const origin = canChooseOrigin ? (originChoice ?? "auto") : "manual";

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

  // Who gets invited, and the note that goes in their email.
  const [invitees, setInvitees] = useState(() => [emptyInvitee()]);
  const [showInviteErrors, setShowInviteErrors] = useState(false);
  const [checkingInvitees, setCheckingInvitees] = useState(false);
  const [message, setMessage] = useState(
    "Please review the shared claim and supporting documents, and respond within 7 business days."
  );
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [createdMatrixId, setCreatedMatrixId] = useState(null);
  const [inviteResults, setInviteResults] = useState([]);

  const claimPackageOptions = useMemo(() => packages ?? [], [packages]);
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
  const selectedClaim = claimPackageOptions.find((claim) => claim.id === selectedClaimId) ?? null;
  const inviteErrors = validateInvitees(invitees, user?.email);
  const filledInvitees = invitees.filter((i) => i.email.trim());
  const totalSteps = 6;
  const showReviewSidebar = step === 4 || step === 5;
  // Level 1, Level 4 and Approvers can't start a Matrix — the wizard is shown
  // for reference (blurred, non-interactive) under an explanation.
  const blocked = !tierLoading && !capabilities.initiate;

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

  // Every document on the chosen claim starts ticked; only ticked ones are shared.
  useEffect(() => {
    setSelectedDocs(selectedClaim?.documents ?? []);
  }, [selectedClaim]);

  function toggleDoc(name) {
    setSelectedDocs((prev) => (prev.includes(name) ? prev.filter((d) => d !== name) : [...prev, name]));
  }

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
      const shared = { invitees: toInviteePayload(invitees), message };
      const payload = origin === "auto"
        ? { autoClaimId: selectedClaim?.id, includedDocuments: selectedDocs, ...shared }
        : {
            autoClaimId: null,
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
            includedDocuments: fileNames,
            ...shared,
          };
      const res = await createClaimMatrix(payload);
      const created = pickData(res);
      setCreatedMatrixId(created?.id ?? null);
      setInviteResults(created?.inviteResults ?? []);
      setStep(totalSteps);
      toast.success("Matrix started and invitations sent");
    } catch (err) {
      toast.error(err.message || "Could not start the Matrix");
    } finally {
      setSubmitting(false);
    }
  }

  function canContinue() {
    if (blocked || tierLoading) return false;
    if (step === 2 && origin === "auto") return !!selectedClaim;
    if (step === 2 && origin === "manual") return claimNumber.trim().length > 0 || insuredName.trim().length > 0;
    return true;
  }

  // Leaving the invite step: finish any email lookups, then validate.
  async function continueFromInvitees() {
    setCheckingInvitees(true);
    const resolved = await resolveLookups(invitees);
    setInvitees(resolved);
    setCheckingInvitees(false);
    setShowInviteErrors(true);
    if (Object.keys(validateInvitees(resolved, user?.email)).length === 0) setStep(5);
  }

  function handleNext() {
    if (step >= 5) handleCreate();
    else if (step === 4) continueFromInvitees();
    else setStep((current) => Math.min(totalSteps, current + 1));
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
          <CardContent className="flex flex-wrap items-center gap-3 p-4" role="alert">
            <MessageSquareWarning className="h-5 w-5 shrink-0 text-warning-foreground" aria-hidden="true" />
            <div className="min-w-0 flex-1 text-sm">
              <div className="font-semibold text-warning-foreground">
                {capabilities.requestUpgrade
                  ? "Upgrade required to start a Matrix"
                  : tierKey === "approver"
                    ? "Approver accounts are read-only"
                    : "This account can't start a Matrix"}
              </div>
              <div className="mt-0.5 text-muted-foreground">
                {capabilities.requestUpgrade
                  ? "Level 1 accounts work on claims they're invited to. Ask for an upgrade and an Admin will choose Level 2 or Level 3 for you."
                  : "You can view the claims shared with you. The steps below are shown for reference only."}
              </div>
            </div>
            {capabilities.requestUpgrade && (
              <Button asChild size="sm" variant="success">
                <Link to="/upgrade">
                  <ArrowUpCircle className="h-4 w-4" /> Request upgrade
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className={blocked ? "pointer-events-none select-none opacity-50 blur-[1.5px]" : undefined} aria-hidden={blocked || undefined}>
      <div className="mb-6">
        <Stepper steps={STEP_LABELS} current={step} />
      </div>

      {step === 1 && (
        <Card className="mb-5 border-accent/70 bg-card shadow-card">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-3 text-sm lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
              <HandoffStep title="1. Starting point" body={canChooseOrigin ? "Choose below — one of your claims already copied from Claim Toolkit Auto, or enter the matter by hand." : "Manual entry on this account — Auto claims are available to Level 3 (Auto) accounts."} />
              <div className="hidden text-accent lg:block">{"->"}</div>
              <HandoffStep title="2. Add details" body="Auto claims arrive with their whole Assessment already copied in — you choose which documents to share. Manual entry captures the facts and documents by hand." />
              <div className="hidden text-accent lg:block">{"->"}</div>
              <HandoffStep title="3. Invite people" body="Invite anyone by email. Each person only sees the claims they're invited to, and every step is recorded in the Audit Trail." />
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
                  { key: "auto", icon: Workflow, title: "Select claim from Auto", body: "Pick one of your claims whose Assessment is complete — it's already copied into Matrix with all its data.", locked: autoOptionLocked },
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
                            <Lock className="h-3 w-3" aria-hidden="true" /> Level 3 (Auto) accounts only
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {step === 2 && origin === "auto" && (
              packagesLoading ? <Spinner /> : claimPackageOptions.length === 0 ? (
                <EmptyState
                  title="No claims ready for Matrix"
                  body="Claims appear here automatically once their Assessment is completed in Claim Toolkit Auto. You can also go back and use manual entry."
                  action={
                    user?.source === "Claim Toolkit" ? (
                      <Button asChild variant="outline" size="sm">
                        <Link to="/product/auto">Open the Auto app</Link>
                      </Button>
                    ) : null
                  }
                />
              ) : (
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
                  <div className="text-xs text-muted-foreground">Your claims whose Assessment is complete and that haven't been shared yet. One Matrix per claim.</div>
                  <div className="rounded-lg border bg-background overflow-x-auto">
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
              <div className="space-y-4">
                <div className="rounded-lg border bg-background">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
                    <div className="text-sm font-medium">Documents to share</div>
                    <div className="text-xs text-muted-foreground">
                      {selectedDocs.length} of {selectedClaim?.documents?.length ?? 0} selected
                    </div>
                  </div>
                  {(selectedClaim?.documents ?? []).length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">This claim has no documents.</div>
                  ) : (
                    <div className="divide-y">
                      {selectedClaim.documents.map((document) => {
                        const checked = selectedDocs.includes(document);
                        return (
                          <label key={document} className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm">
                            <Checkbox checked={checked} onCheckedChange={() => toggleDoc(document)} />
                            <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
                            <span className="flex-1 break-all">{document}</span>
                            <StatusBadge variant={checked ? "success" : "muted"}>{checked ? "Will be shared" : "Not shared"}</StatusBadge>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="rounded-md border border-accent/40 bg-accent/5 p-3 text-xs text-muted-foreground">
                  <ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-accent" aria-hidden="true" />
                  The rest of the claim — parties, vehicles, statements, the scene and the Assessment — was already copied into
                  Matrix when the Assessment was completed. Only the documents above are optional.
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
                <InviteesField
                  value={invitees}
                  onChange={setInvitees}
                  errors={inviteErrors}
                  showErrors={showInviteErrors}
                />
                <Field label="Message in the invitation email">
                  <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} />
                </Field>
              </div>
            )}

            {step === 5 && origin === "auto" && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <PackageFact icon={ArrowRightLeft} label="Claim" value={selectedClaim?.id ?? "—"} />
                  <PackageFact icon={Building2} label="Your company" value={user?.company ?? "—"} />
                  <PackageFact icon={FileText} label="Documents shared" value={`${selectedDocs.length} of ${selectedClaim?.documents?.length ?? 0}`} />
                  <PackageFact icon={CheckCircle2} label="Assessment" value="Complete" />
                </div>
                <InviteeSummary invitees={filledInvitees} />
              </div>
            )}

            {step === 5 && origin === "manual" && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <PackageFact icon={Building2} label="Origin" value="Manual entry" />
                  <PackageFact icon={FileText} label="Uploaded files" value={`${fileNames.length} documents`} />
                  <PackageFact icon={ShieldCheck} label="Starts at" value="Negotiation" />
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
                <InviteeSummary invitees={filledInvitees} />
              </div>
            )}

            {step === 6 && (
              <div className="space-y-5">
                <div className="rounded-md border border-accent/50 bg-accent/5 p-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-accent text-accent-foreground">
                    <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
                  </div>
                  <h2 className="mt-4 text-xl font-semibold">Matrix started</h2>
                  <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                    {createdMatrixId} is now shared. Each person below was emailed{origin === "auto" ? "; the claim has left your “ready” list" : ""}.
                  </p>
                </div>
                {inviteResults.length > 0 && (
                  <div className="rounded-md border bg-background">
                    <div className="border-b px-4 py-3 text-sm font-medium">Who was invited</div>
                    <ul className="divide-y">
                      {inviteResults.map((r) => (
                        <li key={r.email} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                          <div className="min-w-0">
                            <div className="font-medium">{r.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {r.email} · {LEVEL_LABEL[r.level] ?? r.level}
                            </div>
                          </div>
                          <StatusBadge variant={INVITE_STATUS_VARIANT[r.status] ?? "info"}>{r.status}</StatusBadge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex flex-wrap justify-center gap-2">
                  <Button asChild variant="success">
                    <Link to={createdMatrixId ? `/claims/${createdMatrixId}` : "/claims"}>Open the claim</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/demo-inbox">
                      <Mail className="h-4 w-4" /> See the emails (demo inbox)
                    </Link>
                  </Button>
                </div>
              </div>
            )}

            {step < totalSteps && (
              <div className="flex items-center justify-between border-t pt-4">
                <Button type="button" variant="outline" disabled={step === 1} onClick={() => setStep((current) => Math.max(1, current - 1))}>
                  Back
                </Button>
                {step === 2 && !blocked && !canContinue() && (
                  <p className="ml-auto mr-3 text-xs text-muted-foreground">
                    {origin === "auto" ? "Select a claim to continue." : "Enter a claim number or the insured's name to continue."}
                  </p>
                )}
                <Button
                  type="button"
                  variant="success"
                  disabled={submitting || checkingInvitees || !canContinue()}
                  onClick={handleNext}
                >
                  {step >= 5 ? (submitting ? "Sending…" : "Send invitations") : checkingInvitees ? "Checking…" : "Continue"}
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
                  <DetailRow label="Assessment" value="Complete" />
                  <DetailRow label="Suggested liability" value={selectedClaim?.suggestedLiability ?? "—"} />
                </>
              ) : (
                <>
                  <DetailRow label="Claim number" value={claimNumber || "—"} />
                  <DetailRow label="Insured name" value={insuredName || "—"} />
                  <DetailRow label="Accident type" value={accidentType} />
                  <DetailRow label="Starts at" value="Negotiation" />
                  <DetailRow label="Documents" value={`${fileNames.length} uploaded`} />
                </>
              )}
              <DetailRow label="People invited" value={String(filledInvitees.length)} />
              {origin === "auto" && <DetailRow label="Documents shared" value={String(selectedDocs.length)} />}
              <DetailRow label="Step" value={wizardTitle(step, origin)} />
            </CardContent>
          </Card>
        )}
      </div>
      </div>
    </>
  );
}
