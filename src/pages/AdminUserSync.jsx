import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import Spinner from "@/components/shared/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { runUserSync, updateSyncSettings, getSyncSettings } from "@/services/userService";
import { useSyncRuns, useSyncSettingHistory } from "@/hooks/useSyncRuns";
import { pickData } from "@/services/api";
import { ArrowLeft, RefreshCcw, Clock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const RUN_STATUS_VARIANT = { Queued: "info", Running: "warning", Completed: "success", Failed: "danger" };

function Toggle({ label, checked, onCheckedChange }) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-background p-3 text-sm">
      <Label className="cursor-pointer">{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export default function AdminUserSync() {
  const [mode, setMode] = useState("auto");
  const [interval, setInterval] = useState("hourly");
  const [deactivateRemoved, setDeactivateRemoved] = useState(true);
  const [updateRoleCompany, setUpdateRoleCompany] = useState(true);
  const [notifyAdmins, setNotifyAdmins] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [runsKey, setRunsKey] = useState(0);
  const { data: runs, loading: runsLoading } = useSyncRuns(runsKey);
  const { data: settingHistory } = useSyncSettingHistory(runsKey);

  useEffect(() => {
    const controller = new AbortController();
    getSyncSettings()
      .then((res) => {
        if (controller.signal.aborted) return;
        const settings = pickData(res);
        if (!settings) return;
        if (settings.mode) setMode(settings.mode);
        if (settings.interval) setInterval(settings.interval);
        setDeactivateRemoved(Boolean(settings.deactivateRemoved));
        setUpdateRoleCompany(Boolean(settings.updateRoleCompany));
        setNotifyAdmins(Boolean(settings.notifyAdmins));
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setLoadingSettings(false);
      });
    return () => controller.abort();
  }, []);

  const settingsPayload = () => ({
    mode,
    interval,
    deactivateRemoved,
    updateRoleCompany,
    notifyAdmins,
  });

  const runSync = async () => {
    setSubmitting(true);
    try {
      await runUserSync(settingsPayload());
      toast.success("Sync queued — it will run once the background sync worker is wired up.");
      setRunsKey((k) => k + 1);
    } catch (err) {
      toast.error(err.message || "Could not queue the sync.");
    } finally {
      setSubmitting(false);
    }
  };

  const saveSettings = async () => {
    setSubmitting(true);
    try {
      await updateSyncSettings(settingsPayload());
      toast.success("Sync settings saved.");
      setRunsKey((k) => k + 1);
    } catch (err) {
      toast.error(err.message || "Could not save the settings.");
    } finally {
      setSubmitting(false);
    }
  };

  const lastRun = runs?.[0];

  return (
    <>
      <PageHeader
        title="Sync Claim Toolkit users"
        subtitle="Mirror Claim Toolkit identities into Claim Matrix — manually or on a schedule"
        actions={<Button asChild variant="outline" size="sm"><Link to="/admin/users"><ArrowLeft className="h-4 w-4" /> Back</Link></Button>}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2 shadow-card border-accent/50">
          <CardContent className="p-6 space-y-6">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Sync mode</h3>
              <RadioGroup value={mode} onValueChange={setMode} className="gap-2">
                {[
                  { v: "auto", t: "Auto-sync", d: "Continuously mirror Claim Toolkit users on a schedule. Recommended." },
                  { v: "manual", t: "Manual sync", d: "Pull users only when an admin clicks Run sync." },
                  { v: "off", t: "Off", d: "Disable automatic mirroring. Existing mappings remain." },
                ].map((o) => (
                  <label key={o.v} className="flex items-start gap-3 rounded-md border bg-background p-3 text-sm cursor-pointer hover:bg-muted/40">
                    <RadioGroupItem value={o.v} className="mt-0.5" />
                    <div className="flex-1"><div className="font-medium">{o.t}</div><div className="text-xs text-muted-foreground">{o.d}</div></div>
                    {o.v === "auto" && <StatusBadge variant="success">Recommended</StatusBadge>}
                  </label>
                ))}
              </RadioGroup>
            </section>

            {mode === "auto" && (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Schedule</h3>
                <RadioGroup value={interval} onValueChange={setInterval} className="grid grid-cols-3 gap-2">
                  {[{ v: "15m", t: "Every 15 min" }, { v: "hourly", t: "Hourly" }, { v: "daily", t: "Daily 02:00 UTC" }].map((o) => (
                    <label key={o.v} className="flex items-center gap-2 rounded-md border bg-background p-3 text-sm cursor-pointer hover:bg-muted/40">
                      <RadioGroupItem value={o.v} /><span>{o.t}</span>
                    </label>
                  ))}
                </RadioGroup>
              </section>
            )}

            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Options</h3>
              <Toggle label="Deactivate users removed in Claim Toolkit" checked={deactivateRemoved} onCheckedChange={setDeactivateRemoved} />
              <Toggle label="Update role and company changes" checked={updateRoleCompany} onCheckedChange={setUpdateRoleCompany} />
              <Toggle label="Notify admins of newly added users" checked={notifyAdmins} onCheckedChange={setNotifyAdmins} />
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent sync runs</h3>
                <span className="text-xs text-muted-foreground">{runs?.length ?? 0} recorded</span>
              </div>
              <div className="rounded-md border overflow-hidden">
                {runsLoading ? (
                  <div className="p-4"><Spinner /></div>
                ) : !runs || runs.length === 0 ? (
                  <div className="p-4"><EmptyState title="No sync runs yet" body="Click Run sync now to queue the first one." /></div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr><th className="text-left px-4 py-2">Started</th><th className="text-left px-4 py-2">Mode</th><th className="text-left px-4 py-2">Status</th><th className="text-left px-4 py-2">Summary</th></tr>
                    </thead>
                    <tbody className="divide-y">
                      {runs.map((r) => (
                        <tr key={r.id}>
                          <td className="px-4 py-2 whitespace-nowrap">{new Date(r.startedAt).toLocaleString()}</td>
                          <td className="px-4 py-2">{r.mode ?? "—"}</td>
                          <td className="px-4 py-2"><StatusBadge variant={RUN_STATUS_VARIANT[r.status] || "muted"}>{r.status}</StatusBadge></td>
                          <td className="px-4 py-2 text-muted-foreground">{r.summary ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            {settingHistory && settingHistory.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Settings change history</h3>
                <ul className="divide-y rounded-md border">
                  {settingHistory.map((h, i) => (
                    <li key={i} className="px-4 py-2 text-xs text-muted-foreground">
                      {new Date(h.changedAt).toLocaleString()} · mode set to <span className="font-medium text-foreground">{h.mode ?? "—"}</span>
                      {h.changedBy ? ` by ${h.changedBy}` : ""}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="shadow-card border-accent/50">
            <CardContent className="p-5 space-y-3 text-sm">
              <div className="flex items-center gap-2 font-medium"><Clock className="h-4 w-4 text-primary" /> Last sync</div>
              <div className="text-muted-foreground">
                {loadingSettings ? "Loading…" : lastRun
                  ? `${new Date(lastRun.startedAt).toLocaleString()} · ${lastRun.status}`
                  : "No sync has run yet."}
              </div>
              <div className="flex items-center gap-2 pt-2"><ShieldCheck className="h-4 w-4 text-accent" /> Source of truth: Claim Toolkit</div>
            </CardContent>
          </Card>
          <div className="flex flex-col gap-2">
            <Button onClick={runSync} disabled={submitting}>
              <RefreshCcw className="h-4 w-4" /> {submitting ? "Working…" : "Run sync now"}
            </Button>
            <Button variant="outline" onClick={saveSettings} disabled={submitting}>Save settings</Button>
          </div>
        </div>
      </div>
    </>
  );
}
