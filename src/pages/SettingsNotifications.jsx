import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import PageHeader from "@/components/shared/PageHeader";
import Spinner from "@/components/shared/Spinner";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";
import { updateNotificationPreferences } from "@/services/notificationService";
import { ArrowLeft, Bell, CheckCircle2, Mail, MonitorCheck } from "lucide-react";

export default function SettingsNotifications() {
  const { data: notificationPreferences, loading, error } = useNotificationPrefs();
  const [prefs, setPrefs] = useState([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Seed local editable state from the loaded preferences.
  useEffect(() => {
    if (notificationPreferences) setPrefs(notificationPreferences.map((p) => ({ ...p })));
  }, [notificationPreferences]);

  if (loading) return <Spinner />;

  if (error || !notificationPreferences || notificationPreferences.length === 0) {
    return (
      <>
        <PageHeader
          title="Notification Settings"
          subtitle="Configure email, in-app, and Claim Toolkit / Auto alerts for collaboration events"
          actions={<Button asChild variant="outline" size="sm"><Link to="/settings"><ArrowLeft className="h-4 w-4" /> Back to settings</Link></Button>}
        />
        <EmptyState
          title="Data not found"
          body={error?.message || "No notification preferences are available yet."}
        />
      </>
    );
  }

  const toggle = (index, channel) =>
    setPrefs((prev) => prev.map((p, i) => (i === index ? { ...p, [channel]: !p[channel] } : p)));

  async function handleSave() {
    setSaving(true);
    try {
      await updateNotificationPreferences({ preferences: prefs });
      setSaved(true);
      toast.success("Notification preferences saved");
    } catch (err) {
      toast.error(err.message || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Notification Settings"
        subtitle="Configure email, in-app, and Claim Toolkit / Auto alerts for collaboration events"
        actions={<Button asChild variant="outline" size="sm"><Link to="/settings"><ArrowLeft className="h-4 w-4" /> Back to settings</Link></Button>}
      />

      <Card className="shadow-card border-accent/50">
        <CardContent className="p-0">
          {saved && (
            <div className="flex items-center gap-2 border-b border-accent/40 bg-accent/10 px-5 py-3 text-sm text-accent">
              <CheckCircle2 className="h-4 w-4" />
              Notification preferences saved for email, in-app, and Claim Toolkit / Auto channels.
            </div>
          )}
          <div className="grid grid-cols-[1fr_140px_140px_180px] border-b bg-muted/50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <div>Event</div>
            <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> Email</div>
            <div className="flex items-center gap-2"><Bell className="h-4 w-4" /> In-app</div>
            <div className="flex items-center gap-2"><MonitorCheck className="h-4 w-4" /> Claim Toolkit / Auto</div>
          </div>
          <div className="divide-y">
            {prefs.map((pref, index) => (
              <div key={pref.event} className="grid grid-cols-[1fr_140px_140px_180px] items-center px-5 py-4 text-sm">
                <div>
                  <div className="font-medium">{pref.event}</div>
                  <div className="text-xs text-muted-foreground">Applies to matrixs where you are a participant.</div>
                </div>
                <Switch checked={pref.email} onCheckedChange={() => { setSaved(false); toggle(index, "email"); }} />
                <Switch checked={pref.inApp} onCheckedChange={() => { setSaved(false); toggle(index, "inApp"); }} />
                <Switch checked={pref.claimToolkit} onCheckedChange={() => { setSaved(false); toggle(index, "claimToolkit"); }} />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 border-t p-4">
            <Button type="button" variant="outline" onClick={() => setPrefs(notificationPreferences.map((p) => ({ ...p })))}>Reset</Button>
            <Button type="button" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save preferences"}</Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
