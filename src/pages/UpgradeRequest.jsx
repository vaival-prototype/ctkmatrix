import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowUpCircle, CheckCircle2, Clock, FilePlus2, UserPlus, XCircle } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import Spinner from "@/components/shared/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useUpgradeRequests } from "@/hooks/useUpgradeRequests";
import { createUpgradeRequest } from "@/services/accessService";

const NOTE_LIMIT = 500;
const LEVEL_NAMES = { level2: "Level 2", level3: "Level 3" };

function formatDate(iso) {
  return iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";
}

/**
 * Level 1 asks to be able to start a Matrix. An Admin or Approver decides and
 * picks Level 2 or Level 3; no invoice step in this phase.
 */
export default function UpgradeRequest() {
  const navigate = useNavigate();
  const { user, refreshFromServer } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const { data, loading, error } = useUpgradeRequests(refreshKey);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const latest = (data ?? [])[0] ?? null;
  const pending = latest?.status === "Pending review";
  const approved = latest?.status === "Approved";
  const canAsk = !pending && !approved;

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createUpgradeRequest({ note: note.trim() });
      toast.success("Upgrade request sent");
      setNote("");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err.message || "Couldn't send the request");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRefreshAccess() {
    setRefreshing(true);
    try {
      const next = await refreshFromServer();
      toast.success(`You're now ${LEVEL_NAMES[next?.tier] ?? "upgraded"}`);
      navigate("/new-shared-claim");
    } catch (err) {
      toast.error(err.message || "Couldn't refresh your access");
      setRefreshing(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Request an upgrade"
        subtitle="Level 1 accounts work on claims they're invited to. An upgrade lets you start a Matrix and invite people."
        actions={<StatusBadge variant="info">Current account: Level 1</StatusBadge>}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          {loading ? (
            <Spinner />
          ) : error ? (
            <EmptyState title="Couldn't load your requests" body={error.message} />
          ) : (
            <>
              {latest && (
                <Card
                  className={
                    approved
                      ? "border-accent/60 bg-accent/5 shadow-card"
                      : pending
                        ? "border-info/40 shadow-card"
                        : "border-destructive/40 shadow-card"
                  }
                >
                  <CardContent className="flex flex-wrap items-start gap-3 p-5" role="status">
                    {approved ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-accent" aria-hidden="true" />
                    ) : pending ? (
                      <Clock className="mt-0.5 h-5 w-5 text-info" aria-hidden="true" />
                    ) : (
                      <XCircle className="mt-0.5 h-5 w-5 text-destructive" aria-hidden="true" />
                    )}
                    <div className="min-w-0 flex-1 text-sm">
                      <div className="font-semibold">
                        {approved
                          ? `Approved — you're now ${LEVEL_NAMES[latest.approvedLevel] ?? "upgraded"}`
                          : pending
                            ? "Waiting for review"
                            : "Your last request wasn't approved"}
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        {pending
                          ? `Sent ${formatDate(latest.requestedAt)}. An Admin or Approver will decide and choose Level 2 or Level 3 for you.`
                          : `Decided by ${latest.decidedBy ?? "an Admin"} on ${formatDate(latest.decidedAt)}.`}
                        {latest.note && latest.status === "Rejected" && ` Reason: “${latest.note}”`}
                      </p>
                    </div>
                    {approved && user?.tier === "level1" && (
                      <Button size="sm" variant="success" onClick={handleRefreshAccess} disabled={refreshing}>
                        {refreshing ? "Refreshing…" : "Refresh my access"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {canAsk && (
                <Card className="shadow-card border-accent/50">
                  <CardHeader>
                    <CardTitle className="text-base">{latest ? "Ask again" : "Ask for an upgrade"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form className="space-y-4" onSubmit={handleSubmit}>
                      <div className="space-y-1.5">
                        <Label htmlFor="upgrade-note">Note for the reviewer (optional)</Label>
                        <Textarea
                          id="upgrade-note"
                          rows={4}
                          maxLength={NOTE_LIMIT}
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="e.g. We handle subrogation for several carriers and need to start our own matrices."
                          aria-describedby="upgrade-note-count"
                        />
                        <p id="upgrade-note-count" className="text-right text-xs text-muted-foreground">
                          {note.length}/{NOTE_LIMIT}
                        </p>
                      </div>
                      <Button type="submit" variant="success" className="w-full sm:w-auto" disabled={submitting}>
                        <ArrowUpCircle className="h-4 w-4" /> {submitting ? "Sending…" : "Send upgrade request"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        <Card className="h-fit shadow-card border-accent/50">
          <CardContent className="space-y-3 p-5">
            <div className="font-medium">What changes once approved</div>
            {[
              [FilePlus2, "Start a Matrix by manual entry (Level 2), or with Level 3 tools and full Ask CTK"],
              [UserPlus, "Invite people to your claims"],
              [CheckCircle2, "Your existing claims stay exactly as they are"],
            ].map(([Icon, label]) => (
              <div key={label} className="flex items-start gap-2 text-sm">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                <span>{label}</span>
              </div>
            ))}
            <p className="border-t pt-3 text-xs text-muted-foreground">
              An upgrade applies inside Claim Matrix only — it doesn't create a Claim Toolkit Auto account.
            </p>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/dashboard">Back to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
