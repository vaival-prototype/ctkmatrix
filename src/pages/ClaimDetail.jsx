import { Link, useParams, useLocation, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import StatusBadge from "@/components/shared/StatusBadge";
import Spinner from "@/components/shared/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Handshake,
  Upload,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Calendar,
  MapPin,
  Eye,
  Download,
  FileUp,
  Trash2,
  MessageSquareText,
  History,
  Scale,
  FileClock,
  Route,
} from "lucide-react";
import { toast } from "sonner";
import {
  submitSettlementAction,
  submitClaimDecision,
  submitCompanyAssessment,
  submitDutyAgreement,
} from "@/services/claimService";
import {
  getDocumentDownloadUrl,
  addUnclassifiedUpload,
  promoteUnclassifiedUpload,
  deleteUnclassifiedUpload,
} from "@/services/documentService";
import { useUnclassifiedUploads } from "@/hooks/useUnclassifiedUploads";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClaimDetail } from "@/hooks/useClaimDetail";
import { useDocuments } from "@/hooks/useDocuments";
import { useAuditEvents } from "@/hooks/useAuditEvents";
import { useAuth } from "@/context/AuthContext";
import { useAccessTier } from "@/hooks/useAccessTier";
import ClaimContactRolodex from "@/components/chat/ClaimContactRolodex";
import accidentSceneImg from "@/assets/accident-scene.png";

const claimDetailTabs = ["overview", "participants", "analysis", "negotiation", "evidence", "documents", "audit"];

const dash = (value) => (value === 0 ? 0 : value ?? "—");

function SectionTitle({ children }) {
  return <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</div>;
}

function Fact({ label, value }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium">{dash(value)}</div>
    </div>
  );
}

function NotFound({ title = "Data not found", body }) {
  return <EmptyState title={title} body={body || "No data is available for this section yet."} />;
}

function formatLossLocation(claim) {
  return [claim.lossLocation, claim.lossCity, claim.lossCounty, claim.state, claim.lossZip]
    .filter(Boolean)
    .join(", ");
}

// Persists across all tabs (rendered in the header, outside <Tabs>). Composed entirely from
// fields the claim object already carries — no separate fetch. Current Offer only shows once
// a settlement action has actually been submitted (Exposure/Liability are null until then).
function ClaimSummaryBar({ claim }) {
  const assessments = Array.isArray(claim.companyAssessments) ? claim.companyAssessments : [];
  const hasOffer = claim.exposure != null || claim.liability;
  if (assessments.length === 0 && !hasOffer && !claim.statusLabel) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-md border bg-background px-3 py-2 text-sm">
      {claim.statusLabel && (
        <span className="text-muted-foreground">
          Status: <span className="font-medium text-foreground">{claim.statusLabel}</span>
        </span>
      )}
      {assessments.map((a) => (
        <span key={a.company} className="text-muted-foreground">
          {a.company} Assessment:{" "}
          <span className="font-medium text-foreground">
            {a.splits.map((s) => `${s.company} ${s.percent}%`).join(" / ")}
          </span>
        </span>
      ))}
      {hasOffer && (
        <span className="text-muted-foreground">
          Current Offer:{" "}
          <span className="font-medium text-foreground">
            {claim.exposure != null
              ? `${claim.exposureCurrency ?? "USD"} ${Number(claim.exposure).toLocaleString()}`
              : ""}
            {claim.exposure != null && claim.liability ? " · " : ""}
            {claim.liability || ""}
          </span>
        </span>
      )}
    </div>
  );
}

// Headline = Matrix's own cross-carrier duty agreement (read-only here — the editable
// version stays on the Assessment tab, untouched). Each row expands to Auto Liability's
// own per-party evidence (a separate, more granular data source) when present.
// Party evidence (name/summary/decision/documents) is Auto Liability's own per-party data
// from tmfsql.AutoAssessmentEvidences — always shown here, not hidden behind a toggle. A
// duty with no evidence rows at all shows "Decision In Progress" rather than a blank row.
function AgreementStatusCard({ duties, overallSummary }) {
  const rows = Array.isArray(duties) ? duties : [];

  return (
    <Card className="shadow-card border-accent/60">
      <CardContent className="p-6 space-y-4">
        <SectionTitle>Agreement Status</SectionTitle>
        {rows.length === 0 ? (
          <NotFound body="No duty agreement data is available for this matrix yet." />
        ) : (
          <div className="divide-y rounded-md border bg-background">
            {rows.map((d) => {
              const evidence = Array.isArray(d.partyEvidence) ? d.partyEvidence : [];
              return (
                <div key={d.category} className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium">{d.categoryLabel}</div>
                    <StatusBadge variant={d.status === "agreed" ? "success" : "warning"}>
                      {d.status === "agreed" ? "Agreed" : "Disputed"}
                    </StatusBadge>
                  </div>
                  {d.reason && <p className="text-xs text-muted-foreground">{d.reason}</p>}

                  {evidence.length === 0 ? (
                    <p className="text-xs italic text-muted-foreground">Decision In Progress</p>
                  ) : (
                    <div className="space-y-2">
                      {evidence.map((e, i) => (
                        <div key={i} className="rounded-md border bg-muted/30 p-2.5 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{e.partyName || "Unknown party"}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{e.partyType}</span>
                              <StatusBadge
                                variant={e.status === "agree" ? "success" : e.status === "disagree" ? "danger" : "muted"}
                              >
                                {e.status === "agree" ? "Agrees" : e.status === "disagree" ? "Disagrees" : "Decision In Progress"}
                              </StatusBadge>
                            </div>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {e.summary || "Decision In Progress"}
                          </p>
                          {e.documentNames?.length > 0 && (
                            <div className="mt-1 text-xs text-accent">{e.documentNames.join(", ")}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {overallSummary && (
          <div className="rounded-md border bg-background p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Overall Summary</div>
            <p className="mt-1 text-sm leading-relaxed">{overallSummary}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Real audit trail (same source as the History tab) restyled as a chronological version
// list — v1 is the earliest recorded event, not a fabricated report-generation narrative.
function VersionHistoryCard({ events, loading }) {
  const ordered = Array.isArray(events) ? [...events].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) : [];

  return (
    <Card className="shadow-card border-accent/60">
      <CardContent className="p-6 space-y-4">
        <SectionTitle>Version History</SectionTitle>
        {loading ? (
          <Spinner />
        ) : ordered.length === 0 ? (
          <NotFound body="No history has been recorded for this matrix yet." />
        ) : (
          <div className="space-y-4">
            {ordered.map((e, i) => (
              <div key={e.id || i} className="flex gap-3">
                <div className="flex flex-col items-center pt-1">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  {i < ordered.length - 1 && <span className="mt-1 h-full w-px flex-1 bg-border" />}
                </div>
                <div className="min-w-0 flex-1 pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">
                      v{i + 1} · {e.action}
                    </span>
                    {i === ordered.length - 1 && <StatusBadge variant="info">Latest</StatusBadge>}
                    <span className="text-xs text-muted-foreground">
                      {e.timestamp ? new Date(e.timestamp).toLocaleString() : ""}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {e.actor}
                    {e.actorCompany ? ` · ${e.actorCompany}` : ""}
                  </div>
                  {(e.oldValue || e.newValue) && (
                    <div className="mt-1 text-xs">
                      {e.oldValue && <span className="text-muted-foreground">{e.oldValue} → </span>}
                      {e.newValue && <span>{e.newValue}</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Document/Type/Owner/UploadedBy/Version/Status/Access/Metadata are all real fields on the
// same Document entity the Documents page and DocumentDetail already render.
function EvidenceDocumentsTable({ documents, loading }) {
  if (loading) return <Spinner />;
  if (documents.length === 0) return <NotFound body="No evidence documents are attached to this matrix." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">Document</th>
            <th className="pb-2 pr-4 font-medium">Shared by</th>
            <th className="pb-2 pr-4 font-medium">Sourced from</th>
            <th className="pb-2 pr-4 font-medium">Visibility</th>
            <th className="pb-2 pr-4 font-medium">Status</th>
            <th className="pb-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {documents.map((doc, i) => {
            const sharedBy = [doc.uploadedBy, doc.owner].filter(Boolean).join(" · ");
            // Metadata is free-text label/value pairs an adjuster enters — "sourced from" is
            // only present when someone actually recorded it, not guaranteed on every doc.
            const sourcedFrom = (doc.metadata ?? []).find(([label]) => /source/i.test(label ?? ""))?.[1];
            const visibility = (doc.access ?? []).join(" + ");
            return (
              <tr key={doc?.id || i}>
                <td className="py-3 pr-4 font-medium">{doc?.name || "Document"}</td>
                <td className="py-3 pr-4 text-muted-foreground">{sharedBy || "—"}</td>
                <td className="py-3 pr-4 text-muted-foreground">{sourcedFrom || "—"}</td>
                <td className="py-3 pr-4 text-muted-foreground">{visibility || "—"}</td>
                <td className="py-3 pr-4">
                  {doc?.status ? (
                    <StatusBadge variant="info">{doc.status}</StatusBadge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="py-3">
                  {doc?.id && (
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/documents/${doc.id}`}>Open</Link>
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DocumentsMetadataTable({ documents, loading }) {
  if (loading) return <Spinner />;
  if (documents.length === 0) return <NotFound body="No documents are attached to this matrix yet." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">Document</th>
            <th className="pb-2 pr-4 font-medium">Type</th>
            <th className="pb-2 pr-4 font-medium">Uploaded by</th>
            <th className="pb-2 pr-4 font-medium">Version</th>
            <th className="pb-2 pr-4 font-medium">Status</th>
            <th className="pb-2 pr-4 font-medium">Date</th>
            <th className="pb-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {documents.map((doc, i) => (
            <tr key={doc?.id || i}>
              <td className="py-3 pr-4 font-medium">{doc?.name || "Document"}</td>
              <td className="py-3 pr-4 text-muted-foreground">{doc?.type || "—"}</td>
              <td className="py-3 pr-4 text-muted-foreground">
                {[doc?.uploadedBy, doc?.owner].filter(Boolean).join(" · ") || "—"}
              </td>
              <td className="py-3 pr-4 text-muted-foreground">{doc?.version || "—"}</td>
              <td className="py-3 pr-4 text-muted-foreground">{doc?.status || "—"}</td>
              <td className="py-3 pr-4 text-muted-foreground">
                {doc?.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : "—"}
              </td>
              <td className="py-3">
                {doc?.id && (
                  <div className="flex items-center gap-1">
                    <Button asChild variant="ghost" size="icon" title="Open preview">
                      <Link to={`/documents/${doc.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="icon" title="Download">
                      <a href={getDocumentDownloadUrl(doc.id)}>
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Real calendar-day bucketing off each event's own timestamp — not a fabricated grouping.
function dayBucket(timestamp) {
  const date = new Date(timestamp);
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays <= 7) return "Earlier this week";
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

// Same real AuditEvent data as before, grouped into day sections with a description line
// built from the real actor/actorCompany/oldValue/newValue fields — no invented per-action
// narrative text or category badges, since neither exists in the underlying data.
function HistoryTimeline({ events, loading, emptyBody }) {
  if (loading) return <Spinner />;
  if (!events || events.length === 0) return <NotFound body={emptyBody} />;

  const groups = [];
  for (const e of events) {
    const bucket = dayBucket(e.timestamp);
    const current = groups[groups.length - 1];
    if (current && current.bucket === bucket) current.items.push(e);
    else groups.push({ bucket, items: [e] });
  }

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.bucket}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.bucket}</div>
          <div className="divide-y rounded-md border bg-background">
            {g.items.map((e, i) => (
              <div key={e.id || i} className="flex items-start justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {e === events[0] && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    <span className="text-sm font-semibold">{e.action}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[e.actor, e.actorCompany].filter(Boolean).join(" · ") || "System"}
                    {e.oldValue && <> · {e.oldValue} → </>}
                    {e.newValue && <>{e.oldValue ? "" : " · "}{e.newValue}</>}
                  </p>
                </div>
                <div className="shrink-0 text-xs text-muted-foreground">
                  {e.timestamp ? new Date(e.timestamp).toLocaleString() : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CompanyAssessmentsCard({ claimId, assessments, participants, onSaved }) {
  const { user } = useAuth();
  const myCompany = user?.company ?? "";
  const hasSubmitted = assessments.some((a) => a.company === myCompany);

  const [inputs, setInputs] = useState(() => Object.fromEntries(participants.map((p) => [p, ""])));
  const [submitting, setSubmitting] = useState(false);

  const total = participants.reduce((sum, p) => sum + (Number(inputs[p]) || 0), 0);

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await submitCompanyAssessment(claimId, {
        splits: participants.map((p) => ({ company: p, percent: Number(inputs[p]) || 0 })),
      });
      toast.success("Assessment submitted");
      onSaved();
    } catch (err) {
      toast.error(err.message || "Failed to submit assessment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="shadow-card border-accent/60">
      <CardContent className="p-6 space-y-4">
        <SectionTitle>Company Assessments</SectionTitle>

        {assessments.length === 0 ? (
          <NotFound body="No company has submitted a liability assessment for this matrix yet." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {assessments.map((a) => (
              <div key={a.company} className="rounded-md border bg-background p-3">
                <div className="text-sm font-medium">{a.company} Assessment</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {a.splits.map((s) => `${s.company} ${s.percent}%`).join(" / ")}
                </div>
                {a.submitted && <div className="mt-1 text-xs text-muted-foreground">Submitted {a.submitted}</div>}
              </div>
            ))}
          </div>
        )}

        {myCompany && !hasSubmitted && participants.length > 0 && (
          <form onSubmit={handleSubmit} className="rounded-md border bg-background p-4 space-y-3">
            <div className="text-sm font-medium">Submit your assessment as {myCompany}</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {participants.map((p) => (
                <div key={p} className="space-y-1.5">
                  <Label className="text-xs">{p} %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={inputs[p]}
                    onChange={(e) => setInputs((prev) => ({ ...prev, [p]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <div className={`text-xs ${total === 100 ? "text-muted-foreground" : "text-destructive"}`}>
                Total: {total}% {total !== 100 && "(must equal 100%)"}
              </div>
              <Button type="submit" size="sm" disabled={submitting || total !== 100}>
                {submitting ? "Submitting…" : "Submit assessment"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function DutyAgreementCard({ claimId, duties, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  function startEditing() {
    setDrafts(duties.map((d) => ({ ...d })));
    setEditing(true);
  }

  function updateDraft(category, field, value) {
    setDrafts((prev) => prev.map((d) => (d.category === category ? { ...d, [field]: value } : d)));
  }

  async function handleSave() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await submitDutyAgreement(claimId, {
        items: drafts.map((d) => ({ category: d.category, status: d.status, reason: d.reason })),
      });
      toast.success("Duty agreement updated");
      setEditing(false);
      onSaved();
    } catch (err) {
      toast.error(err.message || "Failed to update duty agreement");
    } finally {
      setSubmitting(false);
    }
  }

  const rows = editing ? drafts : duties;

  return (
    <Card className="shadow-card border-accent/60">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <SectionTitle>Duty Agreement</SectionTitle>
          {editing ? (
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleSave} disabled={submitting}>
                {submitting ? "Saving…" : "Save"}
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={startEditing}>
              Edit
            </Button>
          )}
        </div>

        {rows.length === 0 ? (
          <NotFound body="No duty agreement data is available for this matrix yet." />
        ) : (
          <div className="divide-y rounded-md border bg-background">
            {rows.map((d) => (
              <div key={d.category} className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium">{d.categoryLabel}</div>
                  {editing ? (
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant={d.status === "agreed" ? "success" : "outline"}
                        onClick={() => updateDraft(d.category, "status", "agreed")}
                      >
                        Agreed
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={d.status === "disputed" ? "default" : "outline"}
                        onClick={() => updateDraft(d.category, "status", "disputed")}
                      >
                        Disputed
                      </Button>
                    </div>
                  ) : (
                    <StatusBadge variant={d.status === "agreed" ? "success" : "warning"}>
                      {d.status === "agreed" ? "Agreed" : "Disputed"}
                    </StatusBadge>
                  )}
                </div>
                {editing ? (
                  <Textarea
                    rows={2}
                    placeholder="Reason (optional)"
                    value={d.reason ?? ""}
                    onChange={(e) => updateDraft(d.category, "reason", e.target.value)}
                  />
                ) : (
                  d.reason && <p className="text-xs text-muted-foreground">{d.reason}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Same real data (sceneImageUrl, parties[], participants[]) and rendering conventions
// already used per-row in the Dashboard's Open Claims list — reused here as a single wide
// card at the top of the Investigation tab instead of a compact list row.
function ClaimDetailCard({ claim }) {
  const participants = Array.isArray(claim.participants) ? claim.participants : [];
  const parties = Array.isArray(claim.parties) ? claim.parties : [];
  const location = formatLossLocation(claim);

  return (
    <Card className="shadow-card border-accent/60">
      <CardContent className="p-6 space-y-4">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1 space-y-1">
            {participants.length > 0 && (
              <div className="text-xs text-muted-foreground">{participants.join(" ↔ ")}</div>
            )}
            <div className="text-lg font-semibold">{dash(claim.title)}</div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {claim.dateOfLoss && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(claim.dateOfLoss).toLocaleDateString()}
                  {claim.timeOfLoss ? ` · ${claim.timeOfLoss}` : ""}
                </span>
              )}
              {location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {location}
                </span>
              )}
            </div>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <img
                src={claim.sceneImageUrl || accidentSceneImg}
                alt="Accident scene"
                className="h-20 w-32 shrink-0 rounded border border-border/60 object-cover shadow-sm cursor-zoom-in hover:opacity-90 transition-opacity"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = accidentSceneImg;
                }}
              />
            </DialogTrigger>
            <DialogContent className="max-w-3xl p-2">
              <DialogTitle className="sr-only">Accident scene — {dash(claim.title)}</DialogTitle>
              <img
                src={claim.sceneImageUrl || accidentSceneImg}
                alt="Accident scene"
                className="w-full rounded"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = accidentSceneImg;
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {parties.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Party</th>
                  <th className="pb-2 pr-4 font-medium">Role</th>
                  <th className="pb-2 pr-4 font-medium">Type</th>
                  <th className="pb-2 font-medium">Suggested Neg.</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {parties.map((p, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-4 font-medium">{p.name}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{p.role}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{p.partyType}</td>
                    <td className="py-2 text-muted-foreground">
                      {p.suggestedNegligencePercent != null ? `${p.suggestedNegligencePercent}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ClaimDetail() {
  const { claimId } = useParams();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const searchStr = searchParams.toString();
  const [activeTab, setActiveTab] = useState("overview");
  const [claimRefreshKey, setClaimRefreshKey] = useState(0);
  const reloadClaim = () => setClaimRefreshKey((k) => k + 1);

  const { data: claim, loading, error } = useClaimDetail(claimId, claimRefreshKey);
  const { tierKey, capabilities } = useAccessTier();
  // Level 4 (Claim Party) is strictly view-only in this build: no chat, no
  // uploads, no settlement actions — see authorized evidence and status only.
  const isReadOnly = tierKey === "level4";
  // claim.documents from the claims API is just a count (see APIrequire.md) — the actual
  // document objects live behind GET /documents, matched here by matrixId.
  const { data: allDocuments, loading: documentsLoading } = useDocuments(claimRefreshKey);
  const { data: auditEvents, loading: auditLoading } = useAuditEvents(claimId);
  const { data: unclassifiedUploads, loading: unclassifiedLoading } = useUnclassifiedUploads(claimId, claimRefreshKey);
  const [pendingUpload, setPendingUpload] = useState(null);
  const [uploadingUnclassified, setUploadingUnclassified] = useState(false);
  const [promoteTypes, setPromoteTypes] = useState({});
  const [promotingId, setPromotingId] = useState(null);

  useEffect(() => {
    const requestedTab = new URLSearchParams(searchStr).get("tab");
    if (requestedTab && claimDetailTabs.includes(requestedTab)) {
      setActiveTab(requestedTab);
    } else if (pathname === `/claims/${claimId}`) {
      setActiveTab("overview");
    }
  }, [claimId, pathname, searchStr]);

  function changeTab(nextTab) {
    setActiveTab(nextTab);
    const nextUrl = new URL(window.location.href);
    if (nextTab === "overview") nextUrl.searchParams.delete("tab");
    else nextUrl.searchParams.set("tab", nextTab);
    window.history.replaceState(null, "", `${nextUrl.pathname}${nextUrl.search}`);
  }

  async function handleAddUnclassifiedUpload() {
    if (!pendingUpload) return;
    setUploadingUnclassified(true);
    try {
      await addUnclassifiedUpload({ file: pendingUpload, matrixId: claimId });
      setPendingUpload(null);
      reloadClaim();
      toast.success("Upload added");
    } catch {
      toast.error("Could not add the upload");
    } finally {
      setUploadingUnclassified(false);
    }
  }

  async function handlePromoteUpload(id) {
    const type = promoteTypes[id] || "evidence";
    setPromotingId(id);
    try {
      await promoteUnclassifiedUpload(id, type);
      reloadClaim();
      toast.success("Moved to Evidence");
    } catch {
      toast.error("Could not classify that upload");
    } finally {
      setPromotingId(null);
    }
  }

  async function handleDeleteUpload(id) {
    try {
      await deleteUnclassifiedUpload(id);
      reloadClaim();
    } catch {
      toast.error("Could not remove that upload");
    }
  }

  if (loading) return <Spinner />;

  if (error || !claim) {
    return (
      <div className="py-10">
        <NotFound
          title="Data not found"
          body="This claim matrix could not be loaded. It may not exist or may be unavailable right now."
        />
        <div className="mt-4 flex justify-center">
          <Button asChild variant="outline" size="sm">
            <Link to="/claims">Back to matrixs</Link>
          </Button>
        </div>
      </div>
    );
  }

  const participants = Array.isArray(claim.participants) ? claim.participants : [];
  const participantDetails = Array.isArray(claim.participantDetails) ? claim.participantDetails : [];
  const parties = Array.isArray(claim.parties) ? claim.parties : [];
  const matrixCode = claim.id || claimId;
  const documents = (allDocuments ?? []).filter((d) => d.matrixId === matrixCode);
  const pendingUploads = (unclassifiedUploads ?? []).filter((u) => u.matrixId === matrixCode);

  return (
    <>
      {/* Header — persists across all tabs, rendered outside <Tabs> below */}
      <div className="mb-2 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-muted-foreground">
              <span>
                Matrix Number: <span className="text-foreground font-semibold">{dash(claim.id || claimId)}</span>
              </span>
              {claim.status && <StatusBadge variant="info">{claim.status}</StatusBadge>}
            </div>
            <h1 className="text-lg font-semibold">{dash(claim.title)}</h1>
            <div className="flex flex-wrap items-center gap-2">
              {!isReadOnly && (
                <Button asChild size="sm" variant="success">
                  <Link to={`/claims/${claimId}/settlement`}>
                    <Handshake className="h-4 w-4" /> Propose Settlement
                  </Link>
                </Button>
              )}
              {claim.autoClaimId && (
                tierKey === "level3" ? (
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={`https://claimtoolkit.example.com/auto/claims/${claim.autoClaimId}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" /> Open in Claim Toolkit
                    </a>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    title="Available to CTK Auto (Level 3) accounts only"
                  >
                    <ExternalLink className="h-4 w-4" /> Open in Claim Toolkit
                    <StatusBadge variant="warning">
                      <Sparkles className="h-3 w-3" /> CTK Auto only
                    </StatusBadge>
                  </Button>
                )
              )}
              <Button variant="outline" size="sm" disabled title="Export isn't available yet">
                Export{" "}
                <StatusBadge variant="warning">
                  <Sparkles className="h-3 w-3" /> Coming soon
                </StatusBadge>
              </Button>
            </div>
          </div>
          {capabilities.chat && <ClaimContactRolodex participants={participantDetails} claimId={matrixCode} />}
        </div>
        <ClaimSummaryBar claim={claim} />
      </div>

      {/* Persists across all tabs — same real data/layout as the Dashboard's claim row */}
      <div className="mb-5">
        <ClaimDetailCard claim={claim} />
      </div>

      <Tabs value={activeTab} onValueChange={changeTab}>
        <TabsList className="bg-card border">
          <TabsTrigger value="overview">Investigation</TabsTrigger>
          <TabsTrigger value="participants">Participants</TabsTrigger>
          <TabsTrigger value="analysis">Assessment</TabsTrigger>
          <TabsTrigger value="negotiation">Negotiation</TabsTrigger>
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="audit">History</TabsTrigger>
        </TabsList>

        {/* Investigation / overview */}
        <TabsContent value="overview" className="mt-5 space-y-5">
          <Card className="shadow-card border-accent/60">
            <CardContent className="p-6 space-y-4">
              <SectionTitle>Matrix Overview</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <Fact label="Matrix ID" value={claim.id || claimId} />
                <Fact label="Source claim" value={claim.autoClaimId} />
                <Fact label="Status" value={claim.status} />
                <Fact label="Initiator" value={claim.initiator} />
                <Fact label="Recipient" value={claim.recipient} />
                <Fact label="Liability" value={claim.liability} />
                <Fact label="Exposure" value={claim.exposure} />
                <Fact label="Opened" value={claim.opened} />
                <Fact label="Last updated" value={claim.updated} />
              </div>

              {(claim.claimNumber ||
                claim.insuredName ||
                claim.accidentType ||
                claim.lossLocation ||
                claim.lossCity ||
                claim.lossCounty ||
                claim.lossZip ||
                claim.timeOfLoss) && (
                <div className="rounded-md border bg-background p-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Facts of Loss
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <Fact label="Insured" value={claim.insuredName} />
                    <Fact label="Claim number" value={claim.claimNumber} />
                    <Fact label="Accident type" value={claim.accidentType} />
                    <Fact
                      label="Date of loss"
                      value={claim.dateOfLoss ? new Date(claim.dateOfLoss).toLocaleDateString() : undefined}
                    />
                    <Fact label="Time of loss" value={claim.timeOfLoss} />
                    <Fact label="State" value={claim.state} />
                    <Fact label="Loss location" value={claim.lossLocation} />
                    <Fact label="Loss city" value={claim.lossCity} />
                    <Fact label="Loss county" value={claim.lossCounty} />
                    <Fact label="Loss ZIP" value={claim.lossZip} />
                  </div>
                </div>
              )}

            </CardContent>
          </Card>

          {(() => {
            const askCtkTools = [
              { key: "askCtkStateSummary", label: "State Summary", icon: FileClock },
              { key: "askCtkCaseSummary", label: "Case Summary", icon: Handshake },
              { key: "askCtkStatementSummaries", label: "Statement Summaries", icon: MessageSquareText },
              { key: "askCtkHistories", label: "Histories", icon: History },
              { key: "rebuttalSceneDiagram", label: "Rebuttal Scene Diagram", icon: Route },
            ].filter((tool) => capabilities[tool.key]);
            // Wires the accessTiers capability flags into actual feature visibility instead of
            // just describing them: Level 1 (receive-only) and Level 4 (Claim Party) get no Ask
            // CTK tools at all and this card doesn't render; Level 2 gets State Summary plus
            // histories and the rebuttal diagram; Level 3 gets the full set.
            if (askCtkTools.length === 0) return null;
            return (
              <Card className="shadow-card border-accent/60">
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <SectionTitle>Ask CTK</SectionTitle>
                    <div className="flex flex-wrap gap-1.5">
                      {askCtkTools.map((tool) => (
                        <StatusBadge key={tool.key} variant="info">
                          <tool.icon className="h-3 w-3" /> {tool.label}
                        </StatusBadge>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">Ask CTK is AI. AI can make mistakes.</div>
                  <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
                    <MessageSquareText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <input
                      disabled
                      placeholder={`Ask CTK about this matrix (${askCtkTools.map((t) => t.label).join(", ")})`}
                      className="flex-1 bg-transparent text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/70"
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            <Card className="shadow-card border-accent/60">
              <CardContent className="p-6 space-y-3">
                <SectionTitle>Accident Facts</SectionTitle>
                <div>
                  <div className="text-xs text-muted-foreground">Facts of Loss</div>
                  <p className="mt-1 text-sm leading-relaxed">
                    {claim.accidentDesc || "No facts of loss have been recorded for this claim yet."}
                  </p>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Location of Loss</div>
                  <p className="mt-1 text-sm leading-relaxed">{formatLossLocation(claim) || "—"}</p>
                </div>
              </CardContent>
            </Card>

            <AgreementStatusCard duties={claim.dutyAgreements ?? []} overallSummary={claim.overallSummary} />
          </div>
        </TabsContent>

        {/* Participants */}
        <TabsContent value="participants" className="mt-5 space-y-5">
          <Card className="shadow-card border-accent/60">
            <CardContent className="p-6 space-y-4">
              <SectionTitle>Initiator &amp; Receivers</SectionTitle>
              {participantDetails.length === 0 ? (
                <NotFound body="No participants are recorded for this matrix." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="pb-2 pr-4 font-medium">Participant</th>
                        <th className="pb-2 pr-4 font-medium">Role</th>
                        <th className="pb-2 pr-4 font-medium">Receiver type</th>
                        <th className="pb-2 pr-4 font-medium">Claim Ref</th>
                        <th className="pb-2 pr-4 font-medium">Contact</th>
                        <th className="pb-2 pr-4 font-medium">Received</th>
                        <th className="pb-2 pr-4 font-medium">Last activity</th>
                        <th className="pb-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {participantDetails.map((p, i) => (
                        <tr key={`${p.company}-${i}`}>
                          <td className="py-3 pr-4 font-medium">{p.company}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{p.role}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{p.contactRole || "—"}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{dash(claim.claimNumber || claim.id || claimId)}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{p.contactEmail || "—"}</td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {p.joined ? new Date(p.joined).toLocaleDateString() : "—"}
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {p.lastActivity ? new Date(p.lastActivity).toLocaleDateString() : "—"}
                          </td>
                          <td className="py-3">
                            {p.invitationStatus ? (
                              <StatusBadge variant={p.invitationStatus === "Accepted" ? "success" : "info"}>
                                {p.invitationStatus}
                              </StatusBadge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card border-accent/60">
            <CardContent className="p-6 space-y-4">
              <SectionTitle>Connected Involved Parties</SectionTitle>
              <p className="text-xs text-muted-foreground">
                Real drivers, passengers, witnesses, and other people on the claim, from Claimtoolkit_Auto.
              </p>
              {parties.length === 0 ? (
                <NotFound body="No involved parties are recorded for this matrix." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="pb-2 pr-4 font-medium">Party</th>
                        <th className="pb-2 pr-4 font-medium">Role</th>
                        <th className="pb-2 pr-4 font-medium">Party type</th>
                        <th className="pb-2 pr-4 font-medium">Contact</th>
                        <th className="pb-2 pr-4 font-medium">Invited</th>
                        <th className="pb-2 pr-4 font-medium">Connected</th>
                        <th className="pb-2 pr-4 font-medium">Last activity</th>
                        <th className="pb-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {parties.map((p, i) => (
                        <tr key={i}>
                          <td className="py-3 pr-4 font-medium">{p.name}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{p.role}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{p.partyType}</td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {p.email || p.phone ? (
                              <>
                                {p.email && <div>{p.email}</div>}
                                {p.phone && <div className="text-xs">{p.phone}</div>}
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                          {/* No individual claim party has ever been invited/connected to Matrix
                              — only companies are. Shown as "—" rather than a fabricated value. */}
                          <td className="py-3 pr-4 text-muted-foreground">—</td>
                          <td className="py-3 pr-4 text-muted-foreground">—</td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {p.lastActivity ? new Date(p.lastActivity).toLocaleDateString() : "—"}
                          </td>
                          <td className="py-3 text-muted-foreground">—</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assessment */}
        <TabsContent value="analysis" className="mt-5 space-y-5">
          <CompanyAssessmentsCard
            claimId={claimId}
            assessments={claim.companyAssessments ?? []}
            participants={participants}
            onSaved={reloadClaim}
          />
          <DutyAgreementCard claimId={claimId} duties={claim.dutyAgreements ?? []} onSaved={reloadClaim} />
          <AgreementStatusCard duties={claim.dutyAgreements ?? []} overallSummary={claim.overallSummary} />
        </TabsContent>

        {/* Negotiation (settlement actions + rep decision) */}
        <TabsContent value="negotiation" className="mt-5 space-y-5">
          {isReadOnly && (
            <Card className="border-accent/40 bg-muted/30">
              <CardContent className="p-4 text-xs text-muted-foreground">
                Claim Party accounts can view offer status here but can't propose, accept, or counter.
              </CardContent>
            </Card>
          )}
          <div className={isReadOnly ? "pointer-events-none opacity-60 space-y-5" : "space-y-5"}>
            <SettlementActions claimId={claimId} claim={claim} />
            <ClaimRepDecisionPanel claimId={claimId} />
          </div>
        </TabsContent>

        {/* Evidence */}
        <TabsContent value="evidence" className="mt-5 space-y-5">
          <Card className="shadow-card border-accent/60">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <SectionTitle>Evidence</SectionTitle>
                {!isReadOnly && (
                  <Button asChild variant="success" size="sm">
                    <Link to={`/documents/upload?matrixId=${encodeURIComponent(matrixCode)}`}>
                      <Upload className="h-4 w-4" /> Upload document
                    </Link>
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Evidence scoped to this Matrix.</p>
              <EvidenceDocumentsTable documents={documents} loading={documentsLoading} />
            </CardContent>
          </Card>

          <VersionHistoryCard events={auditEvents} loading={auditLoading} />
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents" className="mt-5 space-y-5">
          <Card className="shadow-card border-accent/60">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <SectionTitle>Documents &amp; Metadata</SectionTitle>
                {!isReadOnly && (
                  <Button asChild variant="success" size="sm">
                    <Link to={`/documents/upload?matrixId=${encodeURIComponent(matrixCode)}`}>
                      <Upload className="h-4 w-4" /> Upload
                    </Link>
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Evidence, statements and structured claim metadata across organizations.
              </p>
              <DocumentsMetadataTable documents={documents} loading={documentsLoading} />
            </CardContent>
          </Card>

          <Card className="shadow-card border-accent/60">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <SectionTitle>Unclassified Uploads</SectionTitle>
                {!isReadOnly && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      className="h-9 w-auto text-xs file:mr-2 file:text-xs"
                      onChange={(e) => setPendingUpload(e.target.files?.[0] ?? null)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!pendingUpload || uploadingUnclassified}
                      onClick={handleAddUnclassifiedUpload}
                    >
                      <FileUp className="h-4 w-4" /> {uploadingUnclassified ? "Adding..." : "Add"}
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Source documents attached to this matrix that have not yet been classified as evidence. Move items
                into Evidence once they are cited in the assessment or referenced in a Theory of the Case.
              </p>

              {unclassifiedLoading ? (
                <Spinner />
              ) : pendingUploads.length === 0 ? (
                <NotFound body="Uploads that haven't been classified into a document type yet will show here." />
              ) : (
                <div className="divide-y divide-border rounded-md border">
                  {pendingUploads.map((u) => (
                    <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{u.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded by {u.uploadedBy} &middot; {u.uploadedAt}
                        </p>
                      </div>
                      {!isReadOnly && (
                        <div className="flex items-center gap-2">
                          <Select
                            value={promoteTypes[u.id] || "evidence"}
                            onValueChange={(val) => setPromoteTypes((prev) => ({ ...prev, [u.id]: val }))}
                          >
                            <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="evidence">Evidence</SelectItem>
                              <SelectItem value="assessment">Assessment</SelectItem>
                              <SelectItem value="statement">Statement</SelectItem>
                              <SelectItem value="scene">Scene diagram</SelectItem>
                              <SelectItem value="legal">State legal summary</SelectItem>
                              <SelectItem value="offer">Settlement offer</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="success"
                            size="sm"
                            disabled={promotingId === u.id}
                            onClick={() => handlePromoteUpload(u.id)}
                          >
                            {promotingId === u.id ? "Moving..." : "Promote"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUpload(u.id)}
                            title="Remove upload"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History */}
        <TabsContent value="audit" className="mt-5">
          <Card className="shadow-card border-accent/60">
            <CardContent className="p-6 space-y-3">
              <SectionTitle>History</SectionTitle>
              <p className="text-xs text-muted-foreground">
                Full chronological event log for {dash(claim.id || claimId)}.
              </p>
              <HistoryTimeline
                events={auditEvents ?? []}
                loading={auditLoading}
                emptyBody="No history events are recorded for this matrix yet."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

function SettlementActions({ claimId }) {
  const [submitting, setSubmitting] = useState(false);
  const [settlementEvent, setSettlementEvent] = useState(null);

  // Counter-offer
  const [counterAmount, setCounterAmount] = useState("");
  const [splitA, setSplitA] = useState("");
  const [splitB, setSplitB] = useState("");
  const [counterRationale, setCounterRationale] = useState("");

  // Accept
  const [acceptNote, setAcceptNote] = useState("");

  async function handleSendCounter() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await submitSettlementAction(claimId, {
        action: "counter",
        amount: counterAmount,
        splits: { initiator: splitA, recipient: splitB },
        rationale: counterRationale,
      });
      setSettlementEvent("counter");
      toast.success("Counter-offer sent");
    } catch (err) {
      toast.error(err.message || "Failed to send counter-offer");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAccept() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await submitSettlementAction(claimId, {
        action: "accept",
        acceptanceNote: acceptNote,
      });
      setSettlementEvent("accepted");
      toast.success("Settlement accepted");
    } catch (err) {
      toast.error(err.message || "Failed to accept settlement");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="shadow-card border-accent/50">
      <CardContent className="p-6 space-y-4">
        <SectionTitle>Settlement Negotiation</SectionTitle>

        {settlementEvent && (
          <div className="flex items-start gap-2 rounded-md border border-accent/40 bg-accent/10 p-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-accent" />
            <div className="text-sm font-medium">
              {settlementEvent === "accepted" ? "Settlement accepted" : "Counter-offer sent"}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Counter-offer */}
          <div className="space-y-3 rounded-md border bg-background p-4">
            <div className="text-sm font-semibold">Send counter-offer</div>
            <div className="space-y-1.5">
              <Label htmlFor="counter-amount">Amount</Label>
              <Input
                id="counter-amount"
                value={counterAmount}
                onChange={(e) => setCounterAmount(e.target.value)}
                placeholder="e.g. 26800"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="split-a">Initiator split %</Label>
                <Input id="split-a" value={splitA} onChange={(e) => setSplitA(e.target.value)} placeholder="e.g. 40" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="split-b">Recipient split %</Label>
                <Input id="split-b" value={splitB} onChange={(e) => setSplitB(e.target.value)} placeholder="e.g. 60" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="counter-rationale">Rationale</Label>
              <Textarea
                id="counter-rationale"
                value={counterRationale}
                onChange={(e) => setCounterRationale(e.target.value)}
                placeholder="Explain the basis for this counter-offer."
                className="min-h-[96px]"
              />
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={handleSendCounter} disabled={submitting}>
                {submitting ? "Sending…" : "Send counter-offer"}
              </Button>
            </div>
          </div>

          {/* Accept */}
          <div className="space-y-3 rounded-md border bg-background p-4">
            <div className="text-sm font-semibold">Accept settlement</div>
            <div className="space-y-1.5">
              <Label htmlFor="accept-note">Acceptance note</Label>
              <Textarea
                id="accept-note"
                value={acceptNote}
                onChange={(e) => setAcceptNote(e.target.value)}
                placeholder="Record the basis for accepting this settlement."
                className="min-h-[96px]"
              />
            </div>
            <div className="flex justify-end">
              <Button size="sm" variant="success" onClick={handleAccept} disabled={submitting}>
                {submitting ? "Submitting…" : "Accept settlement"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ClaimRepDecisionPanel({ claimId }) {
  const [stance, setStance] = useState(null);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSaveDecision() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await submitClaimDecision(claimId, { decision: stance, notes });
      setSaved(true);
      toast.success("Decision saved");
    } catch (err) {
      toast.error(err.message || "Failed to save decision");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="shadow-card border-accent/50">
      <CardContent className="p-6">
        <div className="space-y-4 rounded-md border bg-background p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">Claim Representative Decision</div>
              <div className="text-xs text-muted-foreground">
                Record whether you agree, disagree, or want to modify the analysis. Your decision is logged with the matrix.
              </div>
            </div>
            <StatusBadge variant={saved ? "success" : "muted"}>{saved ? "Decision saved" : "Draft"}</StatusBadge>
          </div>

          <div className="flex flex-wrap gap-2">
            {["agree", "disagree", "modify"].map((opt) => (
              <Button
                key={opt}
                variant={stance === opt ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setStance(opt);
                  setSaved(false);
                }}
              >
                {opt === "agree" ? "Agree" : opt === "disagree" ? "Disagree" : "Agree with modifications"}
              </Button>
            ))}
          </div>

          <div>
            <Label htmlFor="rep-decision-notes" className="text-xs font-semibold">
              Rationale and notes
            </Label>
            <Textarea
              id="rep-decision-notes"
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setSaved(false);
              }}
              placeholder="Explain why you agree or disagree with the analysis. Cite evidence, methodology, or open issues."
              className="mt-1 min-h-[120px] text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStance(null);
                setNotes("");
                setSaved(false);
              }}
            >
              Reset
            </Button>
            <Button size="sm" disabled={!stance || notes.trim().length === 0 || submitting} onClick={handleSaveDecision}>
              {submitting ? "Saving…" : "Save decision"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
